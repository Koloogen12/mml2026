package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/notifier"

	"github.com/google/uuid"
	"google.golang.org/genai"
)

var (
	ErrNoGarments           = errors.New("at least one product must be provided")
	ErrTooManyGarments      = errors.New("maximum 5 products allowed")
	ErrModelPhotoNotFound   = errors.New("model photo not found")
	ErrTryOnFailed          = errors.New("try-on generation failed")
	ErrMonthlyLimitExceeded = errors.New("monthly try-on limit exceeded")
	ErrTryOnNotFound        = errors.New("try-on not found")
)

const tryOnBgTimeout = 360 * time.Second

type tryOnGarment struct {
	product  *model.Product
	category string
	photoURL string
}

type TryOnService struct {
	repos    *repository.Repositories
	storage  *StorageService
	cfg      *config.Config
	client   *http.Client
	notifier *notifier.Telegram
}

func NewTryOn(repos *repository.Repositories, storage *StorageService, cfg *config.Config) *TryOnService {
	// Pick the proxy for Telegram. Dedicated TELEGRAM_PROXY_URL wins; if
	// unset we fall back to AI_PROXY_URL_FALLBACK (which historically stays
	// alive when the AI primary rotates) and only then to AI_PROXY_URL.
	tgProxy := cfg.TelegramProxyURL
	if tgProxy == "" {
		tgProxy = cfg.AIProxyURLFallback
	}
	if tgProxy == "" {
		tgProxy = cfg.AIProxyURL
	}
	return &TryOnService{
		repos:   repos,
		storage: storage,
		cfg:     cfg,
		notifier: notifier.NewTelegram(
			cfg.TelegramBotToken,
			cfg.TelegramChatID,
			cfg.TelegramChatIDOverrides,
			cfg.TelegramAPIBaseURL,
			tgProxy,
		),
		client: &http.Client{
			Timeout: time.Duration(cfg.GeminiTimeoutSec) * time.Second,
		},
	}
}

// projectName fetches the project's display name for notifications.
// On error returns "project#<id>". Best-effort, never fails.
func (s *TryOnService) projectName(ctx context.Context, projectID int) string {
	if p, err := s.repos.Project.GetByID(ctx, projectID); err == nil && p != nil {
		return p.Name
	}
	return fmt.Sprintf("project#%d", projectID)
}

// NotifyValidationRejected sends a Telegram alert when a photo is rejected
// by the AI validator (bad pose, screenshot, etc.). Best-effort, never blocks.
func (s *TryOnService) NotifyValidationRejected(ctx context.Context, projectID int, leadID int64, reason, message string) {
	pname := s.projectName(ctx, projectID)
	s.notifier.SendForProject(pname, notifier.FormatValidationRejected(
		pname, reason, message, leadID,
	))
}

// NotifyUploadError sends a Telegram alert when photo upload fails before
// validation (multipart parse error, MIME not recognized, etc.).
func (s *TryOnService) NotifyUploadError(ctx context.Context, projectID int, leadID int64, kind, detail string) {
	pname := s.projectName(ctx, projectID)
	s.notifier.SendForProject(pname, notifier.FormatUploadError(
		pname, kind, detail, leadID,
	))
}

// NotifyPhotoUploaded sends a Telegram alert when a photo passed validation
// (or validation was bypassed because Gemini was down) and is saved.
func (s *TryOnService) NotifyPhotoUploaded(ctx context.Context, projectID int, leadID int64, validationStatus string, sizeBytes int, mime string) {
	pname := s.projectName(ctx, projectID)
	s.notifier.SendForProject(pname, notifier.FormatPhotoUploaded(
		pname, validationStatus, sizeBytes, mime, leadID,
	))
}

// CleanupStuckJobs resets any processing try-ons left over from a previous server run.
func (s *TryOnService) CleanupStuckJobs(ctx context.Context) {
	if err := s.repos.LeadTryOn.MarkStuckAsError(ctx); err != nil {
		logger.Error("tryon", "cleanup stuck jobs failed", "error", err)
	}
}

// TryOn validates the request, creates a processing record, launches a background job and
// returns 202 immediately so the HTTP connection is not held open for the full Gemini API call.
func (s *TryOnService) TryOn(ctx context.Context, lead *model.Lead, req *dto.TryOnRequest) (*dto.TryOnAcceptedResponse, error) {
	if len(req.ProductIDs) == 0 {
		return nil, ErrNoGarments
	}
	// Up to 5 garments — one per Showroom layer (outerwear + tops + bottoms
	// + shoes + accessories). Widget-side cap matches. Gemini's prompt
	// builder iterates over the slice, no further backend changes needed.
	if len(req.ProductIDs) > 5 {
		return nil, ErrTooManyGarments
	}

	widgetCfg, err := s.repos.WidgetConfig.GetByProjectID(ctx, lead.ProjectID)
	if err != nil {
		logger.Error("tryon", "get widget config failed", "project_id", lead.ProjectID, "error", err)
		return nil, fmt.Errorf("get widget config: %w", err)
	}
	monthlyLimit := int64(10)
	if widgetCfg != nil {
		monthlyLimit = int64(widgetCfg.MonthlyTryOnLimit)
	}

	count, err := s.repos.Lead.CountTryOnsThisMonthByLead(ctx, lead.ID)
	if err != nil {
		logger.Error("tryon", "count try-ons failed", "lead_id", lead.ID, "error", err)
		return nil, fmt.Errorf("count try-ons: %w", err)
	}
	// The monthly cap exists ONLY to push anonymous visitors through the auth
	// wall (its purpose is lead capture). Once a lead has authenticated
	// (Google OAuth / email code), they get unlimited try-ons — abuse is still
	// bounded by the per-IP and per-session hourly/daily limiters in middleware.
	if !lead.IsAuthenticated && count >= monthlyLimit {
		logger.Warn("tryon", "monthly limit exceeded", "lead_id", lead.ID, "count", count, "limit", monthlyLimit, "authenticated", false)
		return nil, ErrMonthlyLimitExceeded
	}

	modelPhoto, err := s.resolveModelPhoto(ctx, lead, req.ModelPhotoID)
	if err != nil {
		return nil, err
	}

	garments, err := s.resolveGarments(ctx, req.ProductIDs)
	if err != nil {
		return nil, err
	}

	tryOn := &model.LeadTryOn{
		LeadID: lead.ID,
		Status: model.TryOnStatusProcessing,
	}
	if modelPhoto.ID != 0 {
		tryOn.ModelPhotoID = &modelPhoto.ID
	}
	s.assignGarmentProducts(tryOn, garments)

	if err := s.repos.LeadTryOn.Create(ctx, tryOn); err != nil {
		logger.Error("tryon", "create try-on record failed", "lead_id", lead.ID, "error", err)
		return nil, fmt.Errorf("create try-on: %w", err)
	}

	// Look up the project's provider just for the notification — actual
	// dispatch happens inside processTryOnBackground which re-reads it.
	provider := "gemini"
	if p, perr := s.repos.Project.GetByID(ctx, lead.ProjectID); perr == nil && p != nil && p.TryonProvider != "" {
		provider = string(p.TryonProvider)
	}
	pnameStarted := s.projectName(ctx, lead.ProjectID)
	s.notifier.SendForProject(pnameStarted, notifier.FormatTryOnStarted(
		pnameStarted, len(garments), provider, lead.ID, tryOn.ID,
	))

	modelPhotoURL := s.storage.GetObjectURL(s.cfg.MinioBucket, modelPhoto.ObjectKey)
	body := extractBodyContext(lead)
	go s.processTryOnBackground(tryOn.ID, lead.ProjectID, lead.ID, modelPhotoURL, garments, body)

	return &dto.TryOnAcceptedResponse{
		PublicID: tryOn.PublicID.String(),
		Status:   string(model.TryOnStatusProcessing),
	}, nil
}

// GetTryOnStatus returns the current status of a try-on job by its public ID.
func (s *TryOnService) GetTryOnStatus(ctx context.Context, lead *model.Lead, tryOnPublicID string) (*dto.TryOnStatusResponse, error) {
	publicID, err := uuid.Parse(tryOnPublicID)
	if err != nil {
		return nil, fmt.Errorf("invalid try_on_id: %w", err)
	}

	tryOn, err := s.repos.LeadTryOn.GetByPublicID(ctx, publicID)
	if err != nil {
		return nil, err
	}
	if tryOn == nil || tryOn.LeadID != lead.ID {
		return nil, ErrTryOnNotFound
	}

	resp := &dto.TryOnStatusResponse{
		PublicID: tryOn.PublicID.String(),
		Status:   string(tryOn.Status),
	}

	if tryOn.Status == model.TryOnStatusDone && tryOn.ResultKey != nil {
		resp.ResultURL = s.storage.GetObjectURL(s.cfg.MinioBucket, *tryOn.ResultKey)
		resp.ResultKey = *tryOn.ResultKey
		resp.Products = s.garmentsFromTryOn(tryOn)
	}

	return resp, nil
}

// GetPublicTryOn returns a try-on result for public sharing (no auth required).
func (s *TryOnService) GetPublicTryOn(ctx context.Context, tryOnPublicID string) (*dto.ShareViewResponse, error) {
	publicID, err := uuid.Parse(tryOnPublicID)
	if err != nil {
		return nil, fmt.Errorf("invalid try_on_id: %w", err)
	}

	tryOn, err := s.repos.LeadTryOn.GetByPublicID(ctx, publicID)
	if err != nil {
		return nil, err
	}
	if tryOn == nil || tryOn.Status != model.TryOnStatusDone || tryOn.ResultKey == nil {
		return nil, ErrTryOnNotFound
	}

	resp := &dto.ShareViewResponse{
		ResultURL: s.storage.GetObjectURL(s.cfg.MinioBucket, *tryOn.ResultKey),
		Products:  s.garmentsFromTryOn(tryOn),
		CreatedAt: tryOn.CreatedAt.Format(time.RFC3339),
	}

	// Enrich with project info for share page
	lead, err := s.repos.Lead.GetByID(ctx, tryOn.LeadID)
	if err == nil && lead != nil {
		project, err := s.repos.Project.GetByID(ctx, lead.ProjectID)
		if err == nil && project != nil {
			resp.ProjectName = project.Name
			resp.SiteURL = project.SiteURL
		}
	}

	return resp, nil
}

// GetHistory returns completed try-on history for a lead.
func (s *TryOnService) GetHistory(ctx context.Context, leadID int64) ([]dto.TryOnHistoryItem, error) {
	tryOns, err := s.repos.LeadTryOn.ListByLeadID(ctx, leadID)
	if err != nil {
		logger.Error("tryon", "list try-on history failed", "lead_id", leadID, "error", err)
		return nil, fmt.Errorf("list try-ons: %w", err)
	}

	items := make([]dto.TryOnHistoryItem, 0, len(tryOns))
	for _, t := range tryOns {
		if t.Status != model.TryOnStatusDone || t.ResultKey == nil {
			continue
		}
		item := dto.TryOnHistoryItem{
			ID:        strconv.FormatInt(t.ID, 10),
			PublicID:  t.PublicID.String(),
			ResultURL: s.storage.GetObjectURL(s.cfg.MinioBucket, *t.ResultKey),
			CreatedAt: t.CreatedAt.Format(time.RFC3339),
		}

		if t.OuterwearProduct != nil {
			cat := ""
			if t.OuterwearProduct.Category != nil {
				cat = *t.OuterwearProduct.Category
			}
			item.Products = append(item.Products, dto.TryOnProductInfo{
				ID: t.OuterwearProduct.PublicID.String(), Name: t.OuterwearProduct.Name, Category: cat,
			})
		}
		if t.TopsProduct != nil {
			cat := ""
			if t.TopsProduct.Category != nil {
				cat = *t.TopsProduct.Category
			}
			item.Products = append(item.Products, dto.TryOnProductInfo{
				ID: t.TopsProduct.PublicID.String(), Name: t.TopsProduct.Name, Category: cat,
			})
		}
		if t.BottomsProduct != nil {
			cat := ""
			if t.BottomsProduct.Category != nil {
				cat = *t.BottomsProduct.Category
			}
			item.Products = append(item.Products, dto.TryOnProductInfo{
				ID: t.BottomsProduct.PublicID.String(), Name: t.BottomsProduct.Name, Category: cat,
			})
		}

		items = append(items, item)
	}
	return items, nil
}

// processTryOnBackground runs in a goroutine with an independent context so it survives
// HTTP disconnects. It calls Gemini API, uploads the result and updates the try-on record.
func (s *TryOnService) processTryOnBackground(tryOnID int64, projectID int, leadID int64, modelPhotoURL string, garments []tryOnGarment, body bodyContext) {
	defer func() {
		if r := recover(); r != nil {
			logger.Error("tryon", "panic in background job", "try_on_id", tryOnID, "panic", r)
			s.failTryOn(tryOnID, fmt.Sprintf("panic: %v", r))
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), tryOnBgTimeout)
	defer cancel()

	tryOn, err := s.repos.LeadTryOn.GetByID(ctx, tryOnID)
	if err != nil || tryOn == nil {
		logger.Error("tryon", "background job: get try-on failed", "try_on_id", tryOnID, "error", err)
		return
	}

	// Resolve which AI provider to use for this project. Default to
	// cometapi-gptimage (MML V5) — GPT Image 2.5 Sunburst through CometAPI.
	// It replaced cometapi-gemini as the default on measured data: same
	// fidelity, ~15× faster on layered looks, cheaper, and far fewer
	// moderation refusals than the alternatives. The project row can pin an
	// older path ('cometapi-gemini' MML V1, or 'gemini' MML V2 direct AI
	// Studio) for projects that need it.
	provider := model.TryonProviderCometAPIGPTImage
	if project, perr := s.repos.Project.GetByID(ctx, projectID); perr == nil && project != nil {
		switch project.TryonProvider {
		case model.TryonProviderCometAPIGPTImage,
			model.TryonProviderCometAPIGemini,
			model.TryonProviderGemini:
			provider = project.TryonProvider
		}
	}

	startedAt := time.Now()
	aiLog := &model.AiApiLog{
		ProjectID:        projectID,
		LeadID:           &leadID,
		Model:            s.cfg.GeminiTryOnModel,
		Provider:         "google-gemini",
		RequestType:      "tryon",
		InputImagesCount: 1 + len(garments),
		Status:           model.AiApiLogStatusPending,
		StartedAt:        startedAt,
	}
	s.repos.AiApiLog.Create(ctx, aiLog)

	var (
		resultBytes []byte
		ext         string
		modelUsed   string
		retryCount  int
	)
	switch provider {
	case model.TryonProviderCometAPIGPTImage:
		resultBytes, ext, modelUsed, retryCount, err = s.callCometAPIGPTImage(ctx, modelPhotoURL, garments, body, aiLog)
		// Cross-provider fallback. GPT Image is new as the default, so a bad
		// day upstream (outage, a garment its moderation refuses on every
		// model in the chain, a format it rejects) must not turn into a dead
		// try-on for the customer — Gemini stays warm behind it. Only the
		// customer-visible outcome matters here, so we retry on any failure,
		// not just specific codes.
		if err != nil {
			logger.Warn("tryon", "gptimage failed, falling back to cometapi-gemini",
				"try_on_id", tryOnID, "error", err)
			var fbRetries int
			resultBytes, ext, modelUsed, fbRetries, err = s.callCometAPIGemini(ctx, modelPhotoURL, garments, body, aiLog)
			retryCount += fbRetries + 1
		}
	case model.TryonProviderCometAPIGemini:
		resultBytes, ext, modelUsed, retryCount, err = s.callCometAPIGemini(ctx, modelPhotoURL, garments, body, aiLog)
	default:
		resultBytes, ext, modelUsed, retryCount, err = s.callGeminiAPI(ctx, modelPhotoURL, garments, body, aiLog)
	}

	now := time.Now()
	latencyMs := int(time.Since(startedAt).Milliseconds())
	aiLog.LatencyMs = &latencyMs
	aiLog.FinishedAt = &now
	aiLog.RetryCount = retryCount
	if modelUsed != "" {
		aiLog.Model = modelUsed
	}

	if err != nil {
		aiLog.Status = model.AiApiLogStatusError
		// Колонка error_message — varchar(1024). Ответы провайдеров бывают
		// длиннее (429 от Google приходит с полным QuotaFailure), и без
		// обрезки UPDATE падает целиком: причина сбоя не попадает в лог
		// именно тогда, когда она нужнее всего. Режем по рунам, чтобы не
		// оборвать символ на середине.
		errMsg := truncateRunes(err.Error(), 1024)
		aiLog.ErrorMessage = &errMsg
		s.repos.AiApiLog.Update(ctx, aiLog)
		logger.Error("tryon", "background job: AI provider failed", "try_on_id", tryOnID, "provider", string(provider), "retries", retryCount, "latency_ms", latencyMs, "error", err)
		pnameFail := s.projectName(ctx, projectID)
		s.notifier.SendForProject(pnameFail, notifier.FormatTryOnFailed(
			pnameFail, string(provider), latencyMs, leadID, tryOnID, errMsg,
		))
		s.failTryOn(tryOnID, err.Error())
		return
	}

	aiLog.Status = model.AiApiLogStatusSuccess
	s.repos.AiApiLog.Update(ctx, aiLog)

	// Композит идентичности до подгонки под пропорции: fitResultToModel
	// добавляет белые поля, после которых оригинал и генерация перестают
	// совпадать по геометрии. Здесь же resultBytes — это уже результат
	// ПОБЕДИВШЕГО провайдера, включая кросс-фолбэк на Gemini выше.
	// Сбой сервиса не роняет примерку: вернётся вход без изменений.
	resultBytes, ext = s.applyIdentityComposite(ctx, modelPhotoURL, resultBytes, ext)

	resultBytes, ext = s.fitResultToModel(ctx, modelPhotoURL, resultBytes, ext)

	// Watermark disabled — low quality, to be redesigned
	// resultBytes, ext = applyWatermark(resultBytes, ext)

	resultKey := fmt.Sprintf("tryon-results/%s%s", uuid.New().String(), ext)
	contentType := "image/png"
	if ext == ".jpg" || ext == ".jpeg" {
		contentType = "image/jpeg"
	}
	if err := s.storage.UploadBytes(ctx, s.cfg.MinioBucket, resultKey, resultBytes, contentType); err != nil {
		logger.Error("tryon", "background job: upload result failed", "try_on_id", tryOnID, "result_key", resultKey, "error", err)
		s.failTryOn(tryOnID, err.Error())
		return
	}

	tryOn.Status = model.TryOnStatusDone
	tryOn.ResultKey = &resultKey
	if err := s.repos.LeadTryOn.Update(ctx, tryOn); err != nil {
		logger.Error("tryon", "background job: update try-on failed", "try_on_id", tryOnID, "error", err)
		return
	}

	aiLog.TryOnID = &tryOn.ID
	s.repos.AiApiLog.Update(ctx, aiLog)

	logger.Info("tryon", "background job done", "try_on_id", tryOnID, "latency_ms", latencyMs)
	pnameDone := s.projectName(ctx, projectID)
	caption := notifier.FormatTryOnDone(
		pnameDone, modelUsed, string(provider), latencyMs, leadID, tryOnID,
	)
	// Attach the result image to the success notification so admins can
	// eyeball quality straight from Telegram. Bytes are uploaded as
	// multipart through the same proxy chain as text messages — TG's
	// URL-fetch mode doesn't work because RU networks block reverse
	// traffic from TG's CDN to our host.
	tgFilename := fmt.Sprintf("tryon_%d%s", tryOnID, ext)
	s.notifier.SendPhotoForProject(pnameDone, resultBytes, tgFilename, caption)
}

func (s *TryOnService) failTryOn(tryOnID int64, reason string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tryOn, err := s.repos.LeadTryOn.GetByID(ctx, tryOnID)
	if err != nil || tryOn == nil {
		return
	}
	tryOn.Status = model.TryOnStatusError
	if err := s.repos.LeadTryOn.Update(ctx, tryOn); err != nil {
		logger.Error("tryon", "fail try-on update failed", "try_on_id", tryOnID, "reason", reason, "error", err)
	}
}

// resolveModelPhoto loads the model photo from lead photos or avatars.
func (s *TryOnService) resolveModelPhoto(ctx context.Context, lead *model.Lead, modelPhotoID string) (*model.LeadPhoto, error) {
	photoPublicID, err := uuid.Parse(modelPhotoID)
	if err != nil {
		logger.Error("tryon", "invalid model_photo_id", "model_photo_id", modelPhotoID, "error", err)
		return nil, fmt.Errorf("invalid model_photo_id: %w", err)
	}

	photos, err := s.repos.LeadPhoto.ListByLeadID(ctx, lead.ID)
	if err != nil {
		logger.Error("tryon", "list lead photos failed", "lead_id", lead.ID, "error", err)
		return nil, fmt.Errorf("list photos: %w", err)
	}
	for _, p := range photos {
		if p.PublicID == photoPublicID {
			return p, nil
		}
	}

	avatar, err := s.repos.Avatar.GetByPublicID(ctx, modelPhotoID)
	if err != nil {
		logger.Error("tryon", "get avatar failed", "model_photo_id", modelPhotoID, "error", err)
		return nil, fmt.Errorf("get avatar: %w", err)
	}
	if avatar != nil {
		return &model.LeadPhoto{ObjectKey: avatar.PhotoKey, Type: "avatar"}, nil
	}

	logger.Warn("tryon", "model photo not found", "lead_id", lead.ID, "model_photo_id", modelPhotoID)
	return nil, ErrModelPhotoNotFound
}

// resolveGarments loads products by public ID and builds the garment list.
func (s *TryOnService) resolveGarments(ctx context.Context, productIDs []string) ([]tryOnGarment, error) {
	var garments []tryOnGarment
	for _, pidStr := range productIDs {
		pid, err := uuid.Parse(pidStr)
		if err != nil {
			logger.Error("tryon", "invalid product_id", "product_id", pidStr, "error", err)
			return nil, fmt.Errorf("invalid product_id %s: %w", pidStr, err)
		}
		product, err := s.repos.Product.GetByPublicID(ctx, pid)
		if err != nil {
			logger.Error("tryon", "get product failed", "product_id", pidStr, "error", err)
			return nil, fmt.Errorf("get product: %w", err)
		}
		if product == nil {
			logger.Warn("tryon", "product not found", "product_id", pidStr)
			return nil, fmt.Errorf("product not found: %s", pidStr)
		}

		cat := ""
		if product.Category != nil {
			cat = *product.Category
		}

		// Prefer the in-MinIO copy (object_key) — fast, on-prem, stable.
		// Fall back to external_url for products that were seeded directly
		// without going through the e-commerce sync that mirrors photos to
		// MinIO (e.g. the public demo project: noconcept / bruler / christi
		// catalogs were inserted with photo URLs only). Without this fallback
		// loadImageBytes would request the MinIO bucket root and get back an
		// XML listing, which Gemini then rejects with
		//   "mimeType parameter with value application/xml is not supported".
		photoURL := ""
		if len(product.Photos) > 0 {
			ph := product.Photos[0]
			if strings.TrimSpace(ph.ObjectKey) != "" {
				photoURL = s.storage.GetObjectURL(photoBucket, ph.ObjectKey)
			} else if ph.ExternalURL != nil && strings.TrimSpace(*ph.ExternalURL) != "" {
				photoURL = strings.TrimSpace(*ph.ExternalURL)
			}
		}

		garments = append(garments, tryOnGarment{product: product, category: cat, photoURL: photoURL})
	}
	return garments, nil
}

// assignGarmentProducts sets product FK fields on the try-on record.
func (s *TryOnService) assignGarmentProducts(tryOn *model.LeadTryOn, garments []tryOnGarment) {
	for _, g := range garments {
		switch g.category {
		case "outerwear":
			tryOn.OuterwearProductID = &g.product.ID
		case "tops":
			tryOn.TopsProductID = &g.product.ID
		case "bottoms":
			tryOn.BottomsProductID = &g.product.ID
		case "shoes":
			tryOn.ShoesProductID = &g.product.ID
		case "accessories":
			tryOn.AccessoriesProductID = &g.product.ID
		default:
			if tryOn.TopsProductID == nil {
				tryOn.TopsProductID = &g.product.ID
			} else if tryOn.BottomsProductID == nil {
				tryOn.BottomsProductID = &g.product.ID
			} else if tryOn.OuterwearProductID == nil {
				tryOn.OuterwearProductID = &g.product.ID
			}
		}
	}
}

// garmentsFromTryOn extracts product info from an already-loaded try-on record.
func (s *TryOnService) garmentsFromTryOn(t *model.LeadTryOn) []dto.TryOnProductInfo {
	var products []dto.TryOnProductInfo
	for _, p := range []*model.Product{t.OuterwearProduct, t.TopsProduct, t.BottomsProduct, t.ShoesProduct, t.AccessoriesProduct} {
		if p == nil {
			continue
		}
		cat := ""
		if p.Category != nil {
			cat = *p.Category
		}
		// Prefer DiscountPrice over Price when present (discounted goods).
		price := p.Price
		if p.DiscountPrice != nil && *p.DiscountPrice > 0 {
			price = p.DiscountPrice
		}
		products = append(products, dto.TryOnProductInfo{
			ID:       p.PublicID.String(),
			Name:     p.Name,
			Category: cat,
			Price:    price,
			Currency: p.Currency,
			URL:      p.ProductURL,
		})
	}
	return products
}

type loadedGarment struct {
	garmentType string
	data        []byte
	mimeType    string
	// Product metadata for prompt enrichment
	name        string
	subcategory string
	material    string
	color       string
	description string
}

// bodyContext holds user measurements for fit-aware prompt generation.
type bodyContext struct {
	gender string
	height int
	weight int
	chest  int
	waist  int
	hip    int
	size   string
}

func (s *TryOnService) callGeminiAPI(ctx context.Context, modelPhotoURL string, garments []tryOnGarment, body bodyContext, aiLog *model.AiApiLog) ([]byte, string, string, int, error) {
	if s.cfg.GeminiAPIKey == "" {
		logger.Error("tryon", "Gemini API key not configured")
		return nil, "", "", 0, errors.New("Gemini API key not configured")
	}

	// Load model image as raw bytes
	modelBytes, modelMime, err := s.loadImageBytes(ctx, modelPhotoURL)
	if err != nil {
		logger.Error("tryon", "load model photo failed", "url", modelPhotoURL, "error", err)
		return nil, "", "", 0, fmt.Errorf("load model photo: %w", err)
	}

	// Load garment images as raw bytes, enriched with product metadata
	var loaded []loadedGarment
	for _, g := range garments {
		if g.photoURL == "" {
			continue
		}
		data, mime, err := s.loadImageBytes(ctx, g.photoURL)
		if err != nil {
			logger.Error("tryon", "load garment photo failed", "url", g.photoURL, "category", g.category, "error", err)
			return nil, "", "", 0, fmt.Errorf("load garment photo: %w", err)
		}
		lg := loadedGarment{garmentType: g.category, data: data, mimeType: mime}
		if g.product != nil {
			lg.name = g.product.Name
			if g.product.Subcategory != nil {
				lg.subcategory = *g.product.Subcategory
			}
			if g.product.Material != nil {
				lg.material = *g.product.Material
			}
			if g.product.Color != nil {
				lg.color = *g.product.Color
			}
			if g.product.Description != nil {
				lg.description = *g.product.Description
			}
		}
		loaded = append(loaded, lg)
	}

	// Build prompt with product metadata and body measurements
	prompt := buildTryOnPrompt(loaded, body)
	aiLog.Prompt = &prompt

	// Build ordered list of proxies (primary first, then optional fallback).
	// Empty string is a valid "proxy" meaning "direct connection" — the first
	// entry is always s.cfg.AIProxyURL regardless of whether it's empty.
	proxies := []string{s.cfg.AIProxyURL}
	if s.cfg.AIProxyURLFallback != "" && s.cfg.AIProxyURLFallback != s.cfg.AIProxyURL {
		proxies = append(proxies, s.cfg.AIProxyURLFallback)
	}

	// Build the model list to dispatch in parallel.
	// Order: primary, GEMINI_TRYON_FALLBACK_MODEL, then any extras from the
	// comma-separated GEMINI_TRYON_RACE_MODELS. Duplicates and empties are
	// dropped. The whole list is raced concurrently per proxy — first success
	// wins, the others are cancelled.
	primary := s.cfg.GeminiTryOnModel
	models := dedupeNonEmpty([]string{
		primary,
		s.cfg.GeminiTryOnFallbackModel,
	}, splitCommaList(s.cfg.GeminiTryOnRaceModels)...)

	var (
		lastErr       error
		lastModelUsed string = primary
	)

	// For each proxy, race ALL models in parallel. If the first proxy is
	// reachable but every model fails (real Gemini outage on these models)
	// we still try the fallback proxy — it's possible one of the models
	// works fine through a different region.
	for proxyIdx, proxyURL := range proxies {
		proxyLabel := "primary"
		if proxyIdx > 0 {
			proxyLabel = fmt.Sprintf("fallback_%d", proxyIdx)
		}

		imageBytes, ext, modelUsed, err := s.callGeminiHedged(ctx, proxyURL, models, modelBytes, modelMime, loaded, prompt)
		if err == nil {
			if proxyIdx > 0 || modelUsed != primary {
				logger.Warn("tryon", "try-on served via non-primary route",
					"proxy", proxyLabel, "proxy_idx", proxyIdx,
					"model", modelUsed)
			}
			return imageBytes, ext, modelUsed, 0, nil
		}
		lastErr = err
		lastModelUsed = modelUsed

		// If the entire proxy is unreachable, try the next one. Otherwise
		// (every model returned a real upstream error) the issue is with
		// Gemini itself — switching the proxy won't help in 99% of cases,
		// but we still try once because Google occasionally has region-
		// specific outages.
		if proxyIdx+1 < len(proxies) {
			logger.Warn("tryon", "all models failed via proxy, trying next proxy",
				"failed_proxy", proxyLabel, "next_proxy_idx", proxyIdx+1, "error", err)
		}
	}

	return nil, "", lastModelUsed, 0, lastErr
}

// dedupeNonEmpty returns a deduplicated list containing all non-empty entries
// from the head slice followed by any non-empty entries from extras, in order.
func dedupeNonEmpty(head []string, extras ...string) []string {
	seen := make(map[string]bool, len(head)+len(extras))
	out := make([]string, 0, len(head)+len(extras))
	add := func(s string) {
		s = strings.TrimSpace(s)
		if s == "" || seen[s] {
			return
		}
		seen[s] = true
		out = append(out, s)
	}
	for _, s := range head {
		add(s)
	}
	for _, s := range extras {
		add(s)
	}
	return out
}

// splitCommaList splits "a, b ,c" into ["a","b","c"], trimming spaces and
// dropping empties. Used for env-var lists.
func splitCommaList(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// callGeminiHedged dispatches generateContent to multiple models with
// staggered launches: the FIRST model starts immediately; each subsequent
// model is delayed by GeminiTryOnStaggerMs after which it only dispatches
// if no winner has been picked yet. Returns the first successful response.
//
// Why the stagger: full hedged race (every model in parallel) bills you
// for len(models) calls per try-on even when the primary already wins.
// Adaptive race waits for the primary to either succeed (then we pay only
// for that one call) or run past the stagger window (then we hedge the
// rest). On healthy traffic this approaches 1× billing; only on slow /
// failed primary calls does it climb to len(models)×.
//
// Set GEMINI_TRYON_STAGGER_MS=0 to restore legacy parallel-race behaviour.
//
// On a fully-down proxy (every goroutine returns ErrProxyUnreachable) we
// surface ErrProxyUnreachable so the caller can switch proxies. Mixed
// errors (some proxy-connect, some upstream) are surfaced as a single
// joined error string with each model's failure annotated.
func (s *TryOnService) callGeminiHedged(parentCtx context.Context, proxyURL string, models []string, modelBytes []byte, modelMime string, loaded []loadedGarment, prompt string) ([]byte, string, string, error) {
	if len(models) == 0 {
		return nil, "", "", errors.New("no models configured")
	}

	// Bound the entire race by GeminiTimeoutSec — a few seconds longer than
	// individual model timeout would give late successes a chance, but in
	// practice any model that doesn't answer in the per-call timeout is
	// just hanging on Google's side.
	raceCtx, cancel := context.WithTimeout(parentCtx, time.Duration(s.cfg.GeminiTimeoutSec)*time.Second)
	defer cancel()

	stagger := time.Duration(s.cfg.GeminiTryOnStaggerMs) * time.Millisecond

	type result struct {
		bytes []byte
		ext   string
		model string
		err   error
	}
	ch := make(chan result, len(models))

	// dispatched counts how many models actually launched a Gemini call
	// (for logging the win-rate of the "primary alone" path).
	var dispatched int32 = 0

	for i, m := range models {
		go func(modelName string, idx int) {
			// First model dispatches immediately. Subsequent models wait
			// `stagger * idx` and re-check the race context — if a winner
			// has already been picked or the race timed out, this goroutine
			// returns WITHOUT making the HTTP call (== zero billing).
			if idx > 0 && stagger > 0 {
				select {
				case <-time.After(stagger * time.Duration(idx)):
					// Stagger elapsed. Verify race is still live before dispatching.
					if raceCtx.Err() != nil {
						return
					}
				case <-raceCtx.Done():
					// Winner found (or timeout) before our stagger expired.
					return
				}
			}
			atomic.AddInt32(&dispatched, 1)
			imageBytes, ext, err := s.callGeminiOnce(raceCtx, proxyURL, modelName, modelBytes, modelMime, loaded, prompt)
			select {
			case ch <- result{bytes: imageBytes, ext: ext, model: modelName, err: err}:
			case <-raceCtx.Done():
			}
		}(m, i)
	}

	var (
		errMessages   []string
		proxyDeadHits int
		lastModel     = models[0]
		gotResults    int
	)
	for {
		select {
		case r := <-ch:
			gotResults++
			lastModel = r.model
			if r.err == nil {
				logger.Info("tryon", "hedged race won",
					"winner", r.model, "results_in", gotResults,
					"dispatched", atomic.LoadInt32(&dispatched), "fleet_size", len(models))
				cancel() // signal stragglers to bail
				return r.bytes, r.ext, r.model, nil
			}
			if isProxyConnectError(r.err) {
				proxyDeadHits++
			}
			errMessages = append(errMessages, fmt.Sprintf("%s: %v", r.model, r.err))
			// If we've heard back from every model that actually dispatched
			// AND no more models are pending dispatch (stagger elapsed for
			// all), we can stop waiting. Models still in their stagger
			// window may yet dispatch — keep looping until raceCtx times
			// out or every model has reported.
			if gotResults >= len(models) {
				// Every model reported (success path already returned above).
				goto allDone
			}
		case <-raceCtx.Done():
			// Whole race timed out.
			cancel()
			return nil, "", lastModel, fmt.Errorf("hedged race timed out after %ds; partial errors: [%s]",
				s.cfg.GeminiTimeoutSec, strings.Join(errMessages, " | "))
		}
	}
allDone:

	// All models failed. If every failure was a proxy-connect error, surface
	// ErrProxyUnreachable so the caller can switch proxies.
	if proxyDeadHits > 0 && proxyDeadHits == gotResults {
		return nil, "", lastModel, fmt.Errorf("%w (all %d models on this proxy): %s",
			ErrProxyUnreachable, gotResults, strings.Join(errMessages, " | "))
	}
	return nil, "", lastModel, fmt.Errorf("all %d models failed on this proxy: %s",
		gotResults, strings.Join(errMessages, " | "))
}

// ErrProxyUnreachable is returned when the configured AI_PROXY_URL cannot be reached
// (connection refused, no route to host, DNS failure, etc.). Callers use this to
// short-circuit fallback attempts that would go through the same dead proxy.
var ErrProxyUnreachable = errors.New("AI proxy unreachable")

// isProxyConnectError returns true if err looks like a proxy connectivity failure
// (as opposed to a genuine upstream error from Gemini). This is purely a string
// match on the underlying net/http error shapes — good enough since the surface is
// narrow: http.Transport.Proxy always wraps proxy-connect failures with the
// literal prefix "proxyconnect".
func isProxyConnectError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "proxyconnect") ||
		strings.Contains(msg, "connection refused") ||
		strings.Contains(msg, "no route to host") ||
		strings.Contains(msg, "network is unreachable")
}

// (Legacy callGeminiWithRetries removed — replaced by callGeminiHedged which
//  dispatches all configured models in parallel through a single proxy and
//  returns the first success. See git history for the previous sequential
//  retry-with-fallbacks implementation if a rollback is ever needed.)

// callGeminiOnce performs a single Gemini API call and extracts the image from the response.
// proxyURLStr may be "" (direct connection) or a full http://[user:pass@]host:port URL.
func (s *TryOnService) callGeminiOnce(ctx context.Context, proxyURLStr, modelName string, modelBytes []byte, modelMime string, garments []loadedGarment, prompt string) ([]byte, string, error) {
	cc := &genai.ClientConfig{
		APIKey:  s.cfg.GeminiAPIKey,
		Backend: genai.BackendGeminiAPI,
	}

	if proxyURLStr != "" {
		proxyURL, err := url.Parse(proxyURLStr)
		if err != nil {
			return nil, "", fmt.Errorf("parse AI proxy URL: %w", err)
		}
		cc.HTTPClient = &http.Client{
			Timeout: time.Duration(s.cfg.GeminiTimeoutSec) * time.Second,
			Transport: &http.Transport{
				Proxy: http.ProxyURL(proxyURL),
			},
		}
		logger.Info("tryon", "using AI proxy", "proxy", proxyURLStr)
	}

	client, err := genai.NewClient(ctx, cc)
	if err != nil {
		return nil, "", fmt.Errorf("create genai client: %w", err)
	}

	var parts []*genai.Part

	// Interleave text labels with images so Gemini cannot confuse which photo
	// is the customer and which are garment references. The label BEFORE each
	// image is the most reliable way to bind a role to that image part. We
	// use a positive "Reference #N is the SOURCE for X" framing because it
	// works better than purely negative "don't do Y" instructions.
	parts = append(parts, genai.NewPartFromText(
		"REFERENCE #1 — SOURCE FOR THE PERSON. "+
			"This image provides the ONE person who appears in the output: "+
			"their face, hair, skin tone, body shape, pose, and background. "+
			"Memorize these features RIGHT NOW. Every pixel of the person and "+
			"their surroundings in the final image must come from THIS reference. "+
			"No other reference contributes any person to the output.",
	))
	parts = append(parts, genai.NewPartFromBytes(modelBytes, modelMime))

	for i, g := range garments {
		parts = append(parts, genai.NewPartFromText(fmt.Sprintf(
			"REFERENCE #%d — SOURCE FOR A GARMENT ONLY (zone: %s). "+
				"This garment changes ONLY the customer's %s in the output. "+
				"All OTHER zones of the customer (everything except %s) MUST stay "+
				"identical to REFERENCE #1 — same fabric, colour, prints, hems, "+
				"buttons. Do NOT remove, fade, or modify the customer's clothing "+
				"in any zone except the one declared above. "+
				"Read ONLY the garment's shape, colour, pattern, fabric, "+
				"stitching, and construction details. "+
				"The person/mannequin/model who happens to be wearing this "+
				"garment in the photo is a STRANGER — do NOT include them in "+
				"the output, neither as a replacement for REFERENCE #1's person "+
				"nor as a second figure beside her. The garment is the only "+
				"thing this reference contributes; everything else (face, body, "+
				"hair, pose, background) is OUT OF SCOPE.",
			i+2, garmentZoneLabel(g.garmentType),
			garmentZoneLabel(g.garmentType), garmentZoneLabel(g.garmentType),
		)))
		parts = append(parts, genai.NewPartFromBytes(g.data, g.mimeType))
	}

	// Final identity check just before output. Position matters here —
	// the LAST text part is the most recent context Gemini sees, so this
	// is the place to re-anchor "the output is the customer from REFERENCE #1".
	// Without this trailing reminder, multi-reference try-ons sometimes
	// drift toward whichever model in REFERENCE #2+ has the strongest
	// portrait quality.
	parts = append(parts, genai.NewPartFromText(
		fmt.Sprintf(
			"FINAL IDENTITY CHECK (read this last, override any earlier "+
				"interpretation): the person in the output is the EXACT same "+
				"person as in REFERENCE #1 — same face, same hair colour and "+
				"length, same skin tone, same body shape, same pose, same "+
				"background. There are %d garment references; therefore EXACTLY "+
				"%d body zones change between REFERENCE #1 and the output. "+
				"Every other pixel of clothing/skin/hair/face/background is "+
				"copied verbatim from REFERENCE #1. If a reference photo's "+
				"model has a different face or different hair, IGNORE that "+
				"face — the only person allowed in the output is REFERENCE #1's "+
				"customer.",
			len(garments), len(garments),
		),
	))

	// Final consolidated instructions
	parts = append(parts, genai.NewPartFromText(prompt))

	contents := []*genai.Content{
		{Role: "user", Parts: parts},
	}

	// Generate with image output
	result, err := client.Models.GenerateContent(ctx, modelName, contents, &genai.GenerateContentConfig{
		ResponseModalities: []string{"IMAGE", "TEXT"},
	})
	if err != nil {
		return nil, "", fmt.Errorf("generate content: %w", err)
	}

	if result == nil || len(result.Candidates) == 0 || result.Candidates[0].Content == nil {
		return nil, "", errors.New("empty response from Gemini API")
	}

	// Extract image from response parts
	for i, part := range result.Candidates[0].Content.Parts {
		logger.Info("tryon", "response part", "index", i, "has_inline_data", part.InlineData != nil, "text_len", len(part.Text))
		if part.InlineData != nil {
			logger.Info("tryon", "inline data mime", "mime", part.InlineData.MIMEType, "data_len", len(part.InlineData.Data))
		}
		if part.InlineData != nil && strings.HasPrefix(part.InlineData.MIMEType, "image/") {
			ext := extFromMime(part.InlineData.MIMEType)
			return part.InlineData.Data, ext, nil
		}
	}

	logger.Info("tryon", "finish reason", "reason", result.Candidates[0].FinishReason)
	return nil, "", errors.New("no image found in Gemini API response")
}

// garmentZoneLabel maps an internal garmentType (the widget's 5 layers) to a
// human-readable body-zone phrase used inline in the prompt. The phrase
// names the EXACT pixels the new garment is allowed to change — every
// other pixel of the customer must be preserved.
func garmentZoneLabel(garmentType string) string {
	switch garmentType {
	case "outerwear":
		return "outermost torso layer (jacket / coat over the existing top)"
	case "tops":
		return "torso (collarbones to waist; arms if sleeves)"
	case "bottoms":
		return "lower body (waist to ankles)"
	case "shoes":
		return "feet only (footwear)"
	case "accessories":
		return "the specific accessory location (bag in hand / hat on head / belt at waist / scarf on neck / jewellery on its body part)"
	default:
		return "garment area"
	}
}

// extFromMime returns a file extension for a given image MIME type.
func extFromMime(mime string) string {
	switch {
	case strings.Contains(mime, "jpeg"), strings.Contains(mime, "jpg"):
		return ".jpg"
	case strings.Contains(mime, "webp"):
		return ".webp"
	case strings.Contains(mime, "gif"):
		return ".gif"
	default:
		return ".png"
	}
}

// loadImageBytes downloads an image and returns raw bytes + MIME type.
func (s *TryOnService) loadImageBytes(ctx context.Context, imageURL string) ([]byte, string, error) {
	if strings.TrimSpace(imageURL) == "" {
		return nil, "", fmt.Errorf("loadImageBytes: empty URL")
	}

	// Some CDNs (notably Farfetch) sporadically 403 our requests when the
	// User-Agent is missing or matches a known bot string. A real browser-
	// shaped UA + one quick retry covers the flake — observed pattern is
	// transient (next call within seconds returns 200). On the second 403
	// in a row we surface the error.
	const ua = "Mozilla/5.0 (compatible; MakeMeLook/1.0; +https://makemelook.tech)"
	var (
		data       []byte
		statusCode int
		header     http.Header
		lastErr    error
	)
	for attempt := 1; attempt <= 2; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
		if err != nil {
			return nil, "", err
		}
		req.Header.Set("User-Agent", ua)
		req.Header.Set("Accept", "image/*,*/*;q=0.8")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			lastErr = err
			if attempt == 1 {
				continue
			}
			return nil, "", err
		}
		body, readErr := io.ReadAll(resp.Body)
		if closeErr := resp.Body.Close(); closeErr != nil {
			logger.Warn("tryon", "close image response body failed", "url", imageURL, "error", closeErr)
		}
		if readErr != nil {
			lastErr = readErr
			if attempt == 1 {
				continue
			}
			return nil, "", readErr
		}
		data = body
		statusCode = resp.StatusCode
		header = resp.Header
		// Retry once on transient CDN denials (403 / 429 / 5xx).
		if statusCode == http.StatusForbidden ||
			statusCode == http.StatusTooManyRequests ||
			statusCode >= 500 {
			if attempt == 1 {
				logger.Warn("tryon", "loadImageBytes: transient HTTP, retrying",
					"url", imageURL, "status", statusCode)
				continue
			}
		}
		break
	}
	_ = lastErr

	if statusCode != http.StatusOK {
		preview := string(data)
		if len(preview) > 200 {
			preview = preview[:200]
		}
		return nil, "", fmt.Errorf("loadImageBytes: HTTP %d for %s: %s", statusCode, imageURL, preview)
	}
	resp := struct {
		StatusCode int
		Header     http.Header
	}{StatusCode: statusCode, Header: header}

	// Reject non-image responses defensively. Without this, when an upstream
	// (MinIO bucket root, S3 misconfig, dead origin returning HTML) replies
	// with XML/HTML, we used to forward it to Gemini as inline_data and the
	// API rejected the whole request with
	//   "mimeType parameter with value application/xml is not supported".
	// Failing here surfaces the real cause instead.
	mime := resp.Header.Get("Content-Type")
	if mime == "" {
		mime = "image/jpeg"
	}
	if !strings.HasPrefix(mime, "image/") {
		preview := string(data)
		if len(preview) > 200 {
			preview = preview[:200]
		}
		return nil, "", fmt.Errorf("loadImageBytes: %s returned non-image content-type %q (body: %s)",
			imageURL, mime, preview)
	}

	return data, mime, nil
}

func (s *TryOnService) loadImageAsBase64(ctx context.Context, imageURL string) (string, string, error) {
	data, mime, err := s.loadImageBytes(ctx, imageURL)
	if err != nil {
		return "", "", err
	}
	return base64.StdEncoding.EncodeToString(data), mime, nil
}

// PhotoValidationResult is the structured response from ValidateModelPhoto.
type PhotoValidationResult struct {
	OK         bool
	ReasonCode string // "ok" | "no_person" | "not_full_body" | "screenshot" | "text_overlay" | "bad_pose" | "multiple_people" | "other"
	Message    string // human-readable explanation
}

var ErrPhotoRejected = errors.New("photo rejected by validator")

// ValidateModelPhoto runs a quick Gemini vision check to confirm the uploaded
// photo is suitable for virtual try-on: a single person, full body, neutral
// pose, no screenshot UI or text overlay, no obscured face. Returns OK=true
// if the photo passes, OK=false with ReasonCode/Message otherwise.
//
// On infrastructure errors (network, parse) the validator fails OPEN — we
// return OK=true so a broken validator never blocks real users from using
// the widget. Only explicit "reject" verdicts from Gemini block the upload.
func (s *TryOnService) ValidateModelPhoto(ctx context.Context, imageBytes []byte, mimeType string) (*PhotoValidationResult, error) {
	// Kill-switch: skip validation entirely (TRYON_SKIP_VALIDATION=true).
	// Used when we need to preserve CometAPI balance and accept that some
	// garbage photos (screenshots, multi-person, mannequins) will reach the
	// image-gen step and burn budget there.
	if s.cfg.TryOnSkipValidation {
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}
	// Validation routes through CometAPI's Gemini passthrough (same model as
	// try-on, but with CometAPI's billing/balance and no RU-side proxy needed
	// — api.cometapi.com is reachable directly). If CometAPI key is missing,
	// fall back to direct Gemini via the AI proxy chain.
	if s.cfg.CometAPIKey != "" {
		return s.validateModelPhotoViaCometAPI(ctx, imageBytes, mimeType)
	}
	return s.validateModelPhotoViaGemini(ctx, imageBytes, mimeType)
}

// validateModelPhotoViaCometAPI runs the same gatekeeper prompt against
// CometAPI's Gemini passthrough. Direct connection (no AI proxy needed,
// api.cometapi.com is reachable from RU), billed through CometAPI balance.
//
// Capped at 10s wall time so that even a hung CometAPI doesn't block the
// photo upload from reaching Minio (the request handler's WriteTimeout is
// 60s and Minio PUT needs the remaining budget).
func (s *TryOnService) validateModelPhotoViaCometAPI(ctx context.Context, imageBytes []byte, mimeType string) (*PhotoValidationResult, error) {
	const validateBudget = 15 * time.Second
	ctx, cancel := context.WithTimeout(ctx, validateBudget)
	defer cancel()

	modelName := s.cfg.GeminiValidationModel
	if modelName == "" {
		modelName = "gemini-2.5-flash"
	}

	prompt := validationPromptText()

	reqBody := cometGeminiRequest{
		Contents: []cometGeminiContentReq{{
			Role: "user",
			Parts: []cometGeminiPartReq{
				{InlineData: &cometGeminiInlineDataReq{
					MIMEType: mimeType,
					Data:     base64.StdEncoding.EncodeToString(imageBytes),
				}},
				{Text: prompt},
			},
		}},
		// Validator returns text/JSON only — no image output requested.
	}
	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		logger.Warn("tryon", "validate(cometapi): marshal failed, failing open", "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}

	endpoint := fmt.Sprintf(
		"%s/v1beta/models/%s:generateContent",
		strings.TrimRight(s.cfg.CometAPIBaseURL, "/"),
		modelName,
	)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyJSON))
	if err != nil {
		logger.Warn("tryon", "validate(cometapi): build request failed, failing open", "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}
	httpReq.Header.Set("Content-Type", "application/json; charset=utf-8")
	httpReq.Header.Set("Authorization", "Bearer "+s.cfg.CometAPIKey)

	client := &http.Client{Timeout: validateBudget}
	resp, err := client.Do(httpReq)
	if err != nil {
		logger.Warn("tryon", "validate(cometapi): http call failed, failing open", "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Warn("tryon", "validate(cometapi): read response failed, failing open", "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}
	if resp.StatusCode != http.StatusOK {
		preview := string(respBytes)
		if len(preview) > 300 {
			preview = preview[:300]
		}
		logger.Warn("tryon", "validate(cometapi): non-200, failing open",
			"status", resp.StatusCode, "body", preview)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}

	var parsed cometGeminiResponse
	if err := json.Unmarshal(respBytes, &parsed); err != nil {
		logger.Warn("tryon", "validate(cometapi): parse envelope failed, failing open", "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		logger.Warn("tryon", "validate(cometapi): empty content, failing open")
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}

	var raw strings.Builder
	for _, p := range parsed.Candidates[0].Content.Parts {
		if p.Text != "" {
			raw.WriteString(p.Text)
		}
	}
	text := strings.TrimSpace(raw.String())
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var verdict struct {
		OK         bool   `json:"ok"`
		ReasonCode string `json:"reason_code"`
		Message    string `json:"message"`
	}
	if err := json.Unmarshal([]byte(text), &verdict); err != nil {
		logger.Warn("tryon", "validate(cometapi): parse verdict failed, failing open", "raw", text, "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}
	logger.Info("tryon", "photo validation result (cometapi)",
		"ok", verdict.OK, "reason", verdict.ReasonCode, "message", verdict.Message)
	return &PhotoValidationResult{OK: verdict.OK, ReasonCode: verdict.ReasonCode, Message: verdict.Message}, nil
}

// validationPromptText returns the gatekeeper prompt shared between the
// AI-Studio path and the CometAPI path. Kept as a function so the literal
// stays in one place even though it's used twice.
func validationPromptText() string {
	return `You are a permissive gatekeeper for a virtual clothing try-on system. Decide if the attached photo is suitable to use as the CUSTOMER photo for a try-on.

DEFAULT: ACCEPT the photo. Only reject if it is CLEARLY broken in one of the specific ways listed below. Be lenient on pose, framing and head-to-body proportion — the AI generator handles those just fine. When in doubt, ACCEPT.

REJECT only in these CLEAR cases (pick the most specific reason_code):
- The frame contains zero people, only a pet, only an object, or only a drawing/cartoon/CGI/mannequin → reason_code = "no_person"
- The frame contains TWO OR MORE distinct people (a clear group)                                     → reason_code = "multiple_people"
- The image is obviously a phone/app/web screenshot — visible status bar, browser chrome, chat UI,
  large brand watermark, or social media interface                                                   → reason_code = "screenshot"
- The image is a multi-panel collage, grid, side-by-side, or before/after layout                     → reason_code = "other"
- ONLY the head and shoulders are visible — torso is completely cut off above the chest              → reason_code = "not_full_body"

ACCEPT all of the following — these used to be rejected but no longer are:
- Selfies, half-body photos, photos where legs are partly cut off — accept as long as torso is visible
- Photos taken sitting, leaning, hand on hip, arm bent, hand near face — accept any pose
- Indoor backgrounds (room, restaurant, café, car, mirror) — only reject if it's a literal app screenshot
- Photos with mild head-tilt, slight angle to camera, eyes closed, smiling, talking
- Photos where background contains other people in the distance (only reject if there are two clearly framed subjects)

Respond with ONLY a single JSON object, no prose, no code fences:
{"ok": true | false, "reason_code": "ok" | "no_person" | "not_full_body" | "screenshot" | "multiple_people" | "other", "message": "короткое объяснение на русском, что не так с фото — например: 'На фото несколько людей. Загрузите фото только себя.'"}`
}

// validateModelPhotoViaGemini calls AI Studio Gemini through the AI proxy.
// Kept as a fallback for environments without a CometAPI balance.
func (s *TryOnService) validateModelPhotoViaGemini(ctx context.Context, imageBytes []byte, mimeType string) (*PhotoValidationResult, error) {
	if s.cfg.GeminiAPIKey == "" {
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}

	// Hard wall-clock cap on the validator: this call sits BETWEEN the user's
	// HTTP upload and the Minio PUT that persists the photo. If the validator
	// burns the full GeminiTimeoutSec (≥60s) on a dead proxy, the request's
	// WriteTimeout fires before we ever reach Minio → upload returns 500
	// with ctx canceled. Cap at 10s so even a fully-dead proxy degrades to
	// "fail open" quickly and the upload still saves successfully.
	const validateBudget = 15 * time.Second
	ctx, cancel := context.WithTimeout(ctx, validateBudget)
	defer cancel()

	cc := &genai.ClientConfig{
		APIKey:  s.cfg.GeminiAPIKey,
		Backend: genai.BackendGeminiAPI,
	}
	// Pick the most-likely-alive proxy. AI_PROXY_URL_FALLBACK has been the
	// reliable one historically — when the primary AI proxy rotates or dies,
	// the fallback keeps working.
	proxyChoice := s.cfg.AIProxyURLFallback
	if proxyChoice == "" {
		proxyChoice = s.cfg.AIProxyURL
	}
	if proxyChoice != "" {
		proxyURL, err := url.Parse(proxyChoice)
		if err != nil {
			logger.Warn("tryon", "validate: bad proxy URL, failing open", "error", err)
			return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
		}
		cc.HTTPClient = &http.Client{
			Timeout:   validateBudget,
			Transport: &http.Transport{Proxy: http.ProxyURL(proxyURL)},
		}
	}

	client, err := genai.NewClient(ctx, cc)
	if err != nil {
		logger.Warn("tryon", "validate: create client failed, failing open", "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}

	prompt := validationPromptText()

	parts := []*genai.Part{
		genai.NewPartFromBytes(imageBytes, mimeType),
		genai.NewPartFromText(prompt),
	}
	contents := []*genai.Content{{Role: "user", Parts: parts}}

	result, err := client.Models.GenerateContent(ctx, s.cfg.GeminiValidationModel, contents, &genai.GenerateContentConfig{
		ResponseModalities: []string{"TEXT"},
	})
	if err != nil {
		logger.Warn("tryon", "validate: generate failed, failing open", "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}
	if result == nil || len(result.Candidates) == 0 || result.Candidates[0].Content == nil {
		logger.Warn("tryon", "validate: empty response, failing open")
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}

	var raw strings.Builder
	for _, p := range result.Candidates[0].Content.Parts {
		if p.Text != "" {
			raw.WriteString(p.Text)
		}
	}
	text := strings.TrimSpace(raw.String())
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var parsed struct {
		OK         bool   `json:"ok"`
		ReasonCode string `json:"reason_code"`
		Message    string `json:"message"`
	}
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		logger.Warn("tryon", "validate: parse failed, failing open", "raw", text, "error", err)
		return &PhotoValidationResult{OK: true, ReasonCode: "ok"}, nil
	}

	logger.Info("tryon", "photo validation result", "ok", parsed.OK, "reason", parsed.ReasonCode, "message", parsed.Message)
	return &PhotoValidationResult{OK: parsed.OK, ReasonCode: parsed.ReasonCode, Message: parsed.Message}, nil
}

// extractBodyContext pulls body measurements from a Lead for prompt enrichment.
func extractBodyContext(lead *model.Lead) bodyContext {
	bc := bodyContext{}
	if lead.Gender != nil {
		bc.gender = *lead.Gender
	}
	if lead.Height != nil {
		bc.height = *lead.Height
	}
	if lead.Weight != nil {
		bc.weight = *lead.Weight
	}
	if lead.Chest != nil {
		bc.chest = *lead.Chest
	}
	if lead.Waist != nil {
		bc.waist = *lead.Waist
	}
	if lead.Hip != nil {
		bc.hip = *lead.Hip
	}
	if lead.Size != nil {
		bc.size = *lead.Size
	}
	return bc
}

// detectSilhouette scans garment metadata (name/type/material, RU + EN) for a
// cut/fit keyword and returns a canonical English silhouette label to echo back
// into the prompt. Returns "" when no known silhouette word is present, so the
// per-garment ⚠ SILHOUETTE line is only emitted when the merchant actually named
// the cut. Ordering matters: multi-word forms ("wide-leg") are checked before
// their substrings ("wide") so the most specific label wins.
// truncateRunes обрезает строку до max рун, добавляя многоточие, если резали.
// По рунам, а не по байтам: обрыв UTF-8 на середине символа даёт битую
// последовательность, которую Postgres не примет.
func truncateRunes(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	if max <= 1 {
		return string(r[:max])
	}
	return string(r[:max-1]) + "…"
}

func detectSilhouette(s string) string {
	l := strings.ToLower(s)
	// pairs: {canonical label, keyword substrings that map to it}
	table := []struct {
		label string
		keys  []string
	}{
		{"wide-leg / very wide", []string{"wide-leg", "wide leg", "широкие", "широкий", "wide"}},
		{"baggy / very loose", []string{"baggy", "мешков", "багги"}},
		{"oversized / dropped-shoulder", []string{"oversize", "oversized", "оверсайз", "оверсайз"}},
		{"loose / relaxed", []string{"relaxed", "loose", "свободн", "свободный", "свободного"}},
		{"balloon / puffed volume", []string{"balloon", "баллон", "аэростат"}},
		{"flared / wide hem", []string{"flare", "flared", "клёш", "клеш", "расклеш"}},
		{"straight cut", []string{"straight", "прямой", "прямые", "прямого"}},
		{"tapered / narrow hem", []string{"taper", "tapered", "зауж", "зауженные"}},
		{"slim / close fit", []string{"slim", "слим", "узкие", "узкий"}},
		{"skinny / very tight", []string{"skinny", "скинни", "облегающ"}},
		{"cropped / short length", []string{"cropped", "crop", "укороч", "кроп"}},
		{"boxy / square", []string{"boxy", "боксовый", "прямоуголь"}},
	}
	for _, e := range table {
		for _, k := range e.keys {
			if strings.Contains(l, k) {
				return e.label
			}
		}
	}
	return ""
}

func buildTryOnPrompt(garments []loadedGarment, body bodyContext) string {
	garmentCount := len(garments)

	// --- INPUT section: describe each image with rich product metadata ---
	var descriptions []string
	imageIdx := 2
	for _, g := range garments {
		label := "Top/shirt"
		switch g.garmentType {
		case "outerwear":
			label = "Outerwear/jacket"
		case "bottoms":
			label = "Bottoms/pants"
		case "shoes":
			label = "Shoes/footwear"
		case "accessories":
			label = "Accessory (bag/hat/scarf/belt/jewelry)"
		}

		desc := fmt.Sprintf("- Image %d: %s", imageIdx, label)

		// Append product metadata if available
		var meta []string
		if g.name != "" {
			meta = append(meta, fmt.Sprintf("name: %s", g.name))
		}
		if g.subcategory != "" {
			meta = append(meta, fmt.Sprintf("type: %s", g.subcategory))
		}
		if g.material != "" {
			meta = append(meta, fmt.Sprintf("material: %s", g.material))
		}
		if g.color != "" {
			meta = append(meta, fmt.Sprintf("color: %s", g.color))
		}
		if len(meta) > 0 {
			desc += " (" + strings.Join(meta, ", ") + ")"
		}

		// Surface any silhouette/cut keyword found in name+type+material RIGHT
		// next to the image reference. Lighter models (e.g. NB2 Lite) normalise
		// garment cut toward a conventional fit; echoing the intended silhouette
		// inline — where the model pays the most attention — anchors it to keep
		// the wide/oversized/cropped shape instead of defaulting to straight.
		if sil := detectSilhouette(g.name + " " + g.subcategory + " " + g.material); sil != "" {
			desc += fmt.Sprintf("\n  ⚠ SILHOUETTE = %s — reproduce THIS EXACT cut/volume on the customer; do not narrow or normalise it.", sil)
		}

		descriptions = append(descriptions, desc)
		imageIdx++
	}

	// --- BODY CONTEXT section ---
	bodySection := ""
	if body.height > 0 || body.chest > 0 {
		var bodyLines []string
		if body.gender != "" {
			bodyLines = append(bodyLines, fmt.Sprintf("Gender: %s", body.gender))
		}
		if body.height > 0 {
			bodyLines = append(bodyLines, fmt.Sprintf("Height: %d cm", body.height))
		}
		if body.weight > 0 {
			bodyLines = append(bodyLines, fmt.Sprintf("Weight: %d kg", body.weight))
		}
		if body.chest > 0 {
			bodyLines = append(bodyLines, fmt.Sprintf("Chest: %d cm", body.chest))
		}
		if body.waist > 0 {
			bodyLines = append(bodyLines, fmt.Sprintf("Waist: %d cm", body.waist))
		}
		if body.hip > 0 {
			bodyLines = append(bodyLines, fmt.Sprintf("Hip: %d cm", body.hip))
		}
		if body.size != "" {
			bodyLines = append(bodyLines, fmt.Sprintf("Clothing size: %s", body.size))
		}
		bodySection = fmt.Sprintf(`
CUSTOMER BODY MEASUREMENTS:
%s
Use these measurements ONLY to decide how the garment DRAPES and where its seams, waistband, and hems land on this body — NEVER to change the garment's designed silhouette or cut.
The garment's shape is fixed by the reference image, not by the body. A wide-leg trouser stays wide-leg, an oversized coat stays oversized, a baggy jean stays baggy — on ANY body, thin or full.
Body size affects only local fabric tension and drape (where folds gather, where fabric pulls). It NEVER narrows a wide cut, slims an oversized piece, or tightens a loose garment to hug the body.`, strings.Join(bodyLines, "\n"))
	}

	// --- GARMENT FIT section: material-aware draping instructions ---
	var fitRules []string
	for i, g := range garments {
		imgN := i + 2
		switch g.garmentType {
		case "outerwear":
			fitRules = append(fitRules, fmt.Sprintf("□ Image %d — OUTERWEAR: Apply as outermost layer over other garments", imgN))
		case "tops":
			fitRules = append(fitRules, fmt.Sprintf("□ Image %d — TOP: Apply to torso, under outerwear if present", imgN))
		case "bottoms":
			fitRules = append(fitRules, fmt.Sprintf("□ Image %d — BOTTOMS: Apply to lower body from waist down", imgN))
		case "shoes":
			fitRules = append(fitRules, fmt.Sprintf("□ Image %d — SHOES: Apply to feet, replace existing footwear, match perspective and ground plane", imgN))
		case "accessories":
			fitRules = append(fitRules, fmt.Sprintf("□ Image %d — ACCESSORY: Add naturally — bag in hand/on shoulder, hat on head, scarf around neck, belt at waist, jewelry on appropriate body part", imgN))
		}

		// Material-specific draping hints
		mat := strings.ToLower(g.material)
		if mat != "" {
			if strings.Contains(mat, "suede") || strings.Contains(mat, "замш") {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: suede — matte finish, soft structured drape, subtle surface texture"))
			} else if strings.Contains(mat, "leather") || strings.Contains(mat, "кож") {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: leather — slight sheen, structured hold, creases at joints"))
			} else if strings.Contains(mat, "denim") || strings.Contains(mat, "джинс") {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: denim — stiff fabric, visible weave texture, holds shape"))
			} else if strings.Contains(mat, "wool") || strings.Contains(mat, "шерст") || strings.Contains(mat, "cashmere") || strings.Contains(mat, "кашемир") {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: wool/knit — soft drape, visible knit texture, gentle folds"))
			} else if strings.Contains(mat, "cotton") || strings.Contains(mat, "хлопок") {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: cotton — natural drape, soft wrinkles, breathable look"))
			} else if strings.Contains(mat, "silk") || strings.Contains(mat, "шёлк") || strings.Contains(mat, "шелк") || strings.Contains(mat, "сатин") || strings.Contains(mat, "satin") {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: silk/satin — fluid drape, light sheen, flowing folds"))
			} else if strings.Contains(mat, "polyester") || strings.Contains(mat, "nylon") || strings.Contains(mat, "полиэстер") || strings.Contains(mat, "нейлон") {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: synthetic — smooth finish, minimal wrinkles, holds shape"))
			} else {
				fitRules = append(fitRules, fmt.Sprintf("  → Material: %s — render with appropriate texture and drape", g.material))
			}
		}

		// Subcategory and name-based silhouette hints — check both subcategory and product name
		sub := strings.ToLower(g.subcategory)
		nameLower := strings.ToLower(g.name)
		combined := sub + " " + nameLower
		if combined != " " {
			if strings.Contains(combined, "bomber") || strings.Contains(combined, "бомбер") {
				fitRules = append(fitRules, "  → Silhouette: cropped bomber — ends at waist, elastic hem and cuffs")
			} else if strings.Contains(combined, "oversize") || strings.Contains(combined, "оверсайз") {
				fitRules = append(fitRules, "  → Silhouette: oversized — extra volume, dropped shoulders, loose fit")
			} else if strings.Contains(combined, "slim") || strings.Contains(combined, "приталенн") || strings.Contains(combined, "узк") {
				fitRules = append(fitRules, "  → Silhouette: slim fit — follows body contours, minimal excess fabric")
			} else if strings.Contains(combined, "wide") || strings.Contains(combined, "широк") || strings.Contains(combined, "palazzo") || strings.Contains(combined, "палаццо") {
				fitRules = append(fitRules, "  → Silhouette: wide leg — generous width from hip down, relaxed drape, voluminous silhouette")
			} else if strings.Contains(combined, "cropped") || strings.Contains(combined, "укороченн") {
				fitRules = append(fitRules, "  → Silhouette: cropped — shorter than standard length")
			} else if strings.Contains(combined, "свитер") || strings.Contains(combined, "sweater") || strings.Contains(combined, "pullover") || strings.Contains(combined, "пуловер") || strings.Contains(combined, "джемпер") {
				fitRules = append(fitRules, "  → Silhouette: pullover — round or crew neck, moderate body drape")
			} else if strings.Contains(combined, "куртк") || strings.Contains(combined, "jacket") || strings.Contains(combined, "жакет") {
				fitRules = append(fitRules, "  → Silhouette: jacket — structured shoulders, defined front closure")
			} else if strings.Contains(combined, "пальто") || strings.Contains(combined, "coat") {
				fitRules = append(fitRules, "  → Silhouette: coat — longer length, structured, falls below hip")
			} else if strings.Contains(combined, "худи") || strings.Contains(combined, "hoodie") {
				fitRules = append(fitRules, "  → Silhouette: hoodie — casual, hood at back, kangaroo pocket")
			}
		}
	}

	// --- LAYERING section ---
	layering := ""
	if garmentCount > 1 {
		layering = `
LAYERING ORDER (from innermost to outermost):
1. Tops — closest to body, tucked or untucked as shown in garment image
2. Outerwear — over tops, open or closed as shown in garment image
3. Bottoms — independent, from waist down
4. Shoes — on feet, replacing any existing footwear
5. Accessories — added naturally to appropriate body part (bag, hat, scarf, belt, jewelry)
- Ensure natural overlap: outerwear hem overlaps top, top hem meets waistband
- Where layers meet (collar, cuffs, hem), show the inner layer peeking through naturally
- Shoes must match the ground plane and perspective of the original photo
- Accessories should look naturally held/worn, not floating`
	}

	plural := ""
	if garmentCount > 1 {
		plural = "s"
	}

	return fmt.Sprintf(`TASK: Virtual clothing try-on — photorealistic garment fitting

🔒 IDENTITY LOCK + SINGLE-PERSON LOCK (HIGHEST PRIORITY — read this BEFORE anything else):
■ Image 1 contains ONE specific person — the CUSTOMER. The output MUST contain THAT EXACT SAME person, with THAT EXACT SAME face, hair, skin tone, body shape, and pose. No exceptions.
■ ⚠ EXACTLY ONE PERSON IN THE OUTPUT. ⚠ The number of people in the output equals the number of people in Image 1 (which is ONE). You may NOT add a second figure beside, behind, or anywhere in the frame. You may NOT place the catalogue model NEXT TO the customer. The catalogue model does not exist in the output — only the customer does, wearing the catalogue's garment.
■ Images 2, 3, 4, … may show models, mannequins, or hangers. The PEOPLE in those images are STRANGERS to you and to the customer. Their faces, bodies, hairstyles, and skin tones MUST NEVER appear in the output — neither as a replacement for the customer NOR as a second person standing beside her. Treat them as anonymous garment displays — you literally cannot see their faces.
■ The most catastrophic failures (NEVER do these):
   1. Replace the customer's face/body with the catalogue model's (identity destroyed).
   2. Insert the catalogue model as a SECOND figure into the customer's frame, so the output now contains two people instead of one (you've added a stranger to the customer's photo).
   Both are equally bad and equally forbidden.
■ If the customer photo (Image 1) is lower resolution or less flattering than a reference photo's model, that does NOT permit replacing them. The customer's face wins, always — even if it is small, blurry, partially obscured, or lit poorly.
■ Person-count self-check before output: count the visible people in your generated image. The count MUST equal the count in Image 1. If you generated TWO people but Image 1 has ONE, you have failed — delete the extra figure (the catalogue model) and start over.
■ Identity self-check before output: the woman/man in the final image MUST be the same person as in Image 1. If you compare the two and the faces look like different people, you have failed — start over.

ABSOLUTE FRAMING REQUIREMENTS (read SECOND, never violate):
■ Output MUST have the SAME aspect ratio as Image 1 (the customer photo).
■ Output MUST contain the FULL person from Image 1 — head, face, torso, legs, feet — in the SAME positions and at the SAME scale as Image 1.
■ NEVER crop the head, face, or any body part that is visible in Image 1.
■ NEVER zoom in, NEVER recompose, NEVER change the camera angle.
■ The person's silhouette, the background, and the framing must be pixel-aligned with Image 1 — only the clothes are different.
■ If Image 1 is a vertical portrait, output MUST be a vertical portrait. If Image 1 is wide, output is wide. NEVER switch orientation.
■ Decorative borders, watermarks, logos, captions, frames around the image — strictly forbidden.

OUTPUT CONTRACT (read THIRD):
- Return EXACTLY ONE single integrated photograph containing EXACTLY ONE person.
- Mental model: the output = REFERENCE #1's person + REFERENCE #2+'s garments, composited into one image. The person comes from #1 only. The clothes come from #2+ only.
- The output IS REFERENCE #1, modified so its person is wearing the garments from REFERENCE #2+.
- The output is NOT a collage, NOT a grid, NOT side-by-side panels, NOT a before/after comparison, NOT a product catalogue layout, NOT a mosaic of the input images.
- The output is NOT the catalogue model dropped into the customer's background. It IS the customer (face, hair, body from REFERENCE #1) wearing the catalogue's garment.
- If you are uncertain what to produce, produce a photorealistic edit of REFERENCE #1 with the new clothes — never a composition of the input images, and never a frame containing the catalogue model as a separate figure.

INPUT (every reference has a fixed role; never swap them):
- REFERENCE #1: SOURCE FOR THE PERSON — this is the ONLY person in the output. Preserve their face, body, pose, and background. Dress THIS person. Reference #1's person is the only human being you may render.
%s
CRITICAL — GARMENT ISOLATION RULE:
□ Image 1 is ALWAYS the customer. Every other image is a REFERENCE for exactly ONE garment whose LABEL + NAME is given above.
□ Each reference image contains ONE specific garment to use. Even when the reference photo shows a model wearing a full outfit (top + bottom + shoes), you MUST extract ONLY the garment that matches the stated label+name for that image — and IGNORE every other piece of clothing the model happens to wear in that shot.
□ Example of the failure to avoid: the reference for "Bottoms/pants (name: Pink leather skirt)" shows a model wearing that skirt together with a white cutout top. You MUST use ONLY the pink skirt and completely ignore the white top. That top has nothing to do with the try-on.
□ Example: the reference for "Top/shirt (name: Denim corset)" shows the corset on a hanger (no model). You MUST render that exact denim corset on the customer.
□ Rule of thumb: match reference → garment by the LABEL+NAME, never by whichever piece is visually dominant in the frame.

The output must show the person from Image 1 wearing ONLY the garments explicitly listed above (one per Image 2+), as a SINGLE integrated photograph with the same framing as Image 1. Never import any extra clothing that happens to appear in a reference photo.
%s
STRICT PRESERVATION RULES:
□ Face: 100%% identical — features, expression, skin texture, hair
□ Body: Same pose, proportions, visible body parts unchanged
□ Background: Keep all pixels outside the clothing area identical
□ Lighting: Match the ambient light direction, intensity, and color temperature from Image 1
□ Anatomy: Maintain exact neck, shoulders, arms, and hands — no distortion

REPLACE-IN-ZONE, NEVER LAYER, NEVER UNDRESS (read this carefully):
■ The customer in REFERENCE #1 is ALREADY wearing a complete outfit. The replacement rule below applies STRICTLY ONLY to the body zones covered by the supplied garment references. ALL OTHER ZONES OF THE CUSTOMER STAY IDENTICAL TO REFERENCE #1 — same top, same bottoms, same shoes, same accessories, same fabric, same colour, same prints, same logos, same hems. You are editing one zone at a time, not redressing the whole person.
■ For EACH new garment supplied:
   1. Identify which body zone its label declares (Top → torso; Outerwear → outermost torso layer; Bottoms → waist-to-ankles; Shoes → feet; Accessory → its specific spot).
   2. In ONLY that zone, delete the customer's original clothing from those pixels.
   3. Render the new garment in those pixels. No layering, no peek-through, no ghost of the old garment.
■ Body zones for which NO new garment was supplied are STRICTLY UNTOUCHED. Do not delete, modify, fade, lighten, or "transparent-ify" the customer's existing clothing in those zones. The output must show those zones with EVERY visible pixel from REFERENCE #1.
■ Critical examples (these are real failures we must never repeat):
  - ONLY a new TOP is supplied → output keeps the customer's original bottoms, shoes, accessories, jewellery, hair exactly as in REFERENCE #1. Do not strip her bottom half. Do not change her shoes.
  - ONLY new SHOES are supplied → output keeps the customer's original top, bottom, dress, top-of-thigh hem, accessories EXACTLY as in REFERENCE #1. The torso must stay clothed in the same garment, with the same neckline, fabric, and prints. Only the feet change. NEVER remove her shirt/dress because new shoes were provided.
  - ONLY a new ACCESSORY (bag/belt/jewellery) is supplied → ALL of the customer's clothing stays identical; the only change is the added accessory in its specific spot.
  - Customer wears a black crop top, new TOP is a beige tank → output shows ONLY the beige tank on the torso (no black fabric peek-through). Bottom, shoes, accessories: unchanged.
  - Customer wears black bike shorts, new BOTTOM is a midi skirt → output shows ONLY the skirt from waist to its hem. Top and shoes: unchanged.
■ Number-of-changes invariant: if the user supplied N garment references, EXACTLY N body zones differ between REFERENCE #1 and the output. Every other pixel of clothing/accessories/hair/skin/background is preserved verbatim from REFERENCE #1.
■ Skin under the removed original clothing must be reconstructed realistically (matching the customer's skin tone from visible areas) where the new garment doesn't fully cover (e.g. shorter hem, lower neckline, thinner straps than the original) — but this rule applies ONLY inside the changed zone, never spreads to zones with no replacement.

GARMENT SILHOUETTE LOCK (READ BEFORE APPLYING — the silhouette IS the product):
■ The CUT and SILHOUETTE of each garment — wide-leg, baggy, oversized, balloon, flared, straight, slim, skinny, cropped, tapered, boxy, relaxed, A-line, fitted — is the single most important thing to copy from the reference image. It is the main reason the customer wants this exact item.
■ Reproduce the EXACT width, volume, length and leg/arm break shown in the reference, measured RELATIVE TO THE BODY. If the reference trouser leg is ~2× the width of the reference model's leg, it must be ~2× the width of the customer's leg in the output. If a top is cropped at the navel, it stays cropped at the navel. If a jacket is oversized and drops off the shoulder, it stays oversized and drops off the shoulder.
■ Oversized / baggy / wide / loose is ALWAYS intentional design — NEVER "correct", slim, taper, straighten, or tidy it into a conventional fit. A wide-leg trouser that comes out straight-leg, or a baggy jean that comes out regular-fit, is a FAILURE of the whole try-on.
■ A slim customer wearing wide-leg trousers still wears WIDE trousers: the extra fabric hangs and drapes as volume around the leg — it does NOT shrink to the leg. Do not let the customer's body size collapse the garment's silhouette toward their body outline.
■ Copy the fabric's stiffness/flow from the reference: stiff canvas holds a wide boxy shape; soft jersey drapes closer — but "drapes closer" still preserves the cut, it never converts wide into narrow.

GARMENT APPLICATION:
%s
□ For each reference image: first IDENTIFY the single garment that matches its stated label+name (e.g. "Denim corset" in Image 2). If the image shows a model wearing multiple pieces, mentally crop everything except that one garment.
□ Extract the EXACT clothing design, pattern, color, texture, and construction details of the IDENTIFIED garment only — NOT of other clothing the model in the reference photo may wear.
□ Fit each garment onto the person's body and pose WITHOUT changing its designed silhouette — it wraps and drapes over the body, but a wide/loose cut never collapses to hug the body contour
□ Preserve the garment's original proportions AND overall silhouette — leg width, sleeve length, body length, hem break, collar shape, pocket placement, how loose or wide it hangs
□ Generate realistic fabric physics: natural folds at elbows, knees, waist; gravity-appropriate draping
□ Apply consistent shadows and ambient occlusion where garments contact the body
□ Blend garment edges seamlessly with preserved skin and background
□ Maintain the garment's original fit silhouette from the product image — do not make it tighter or looser than shown
□ Never merge details from two different reference images into one piece (e.g. don't splice sleeves from Image 2 onto the body of Image 3).
%s
FORBIDDEN — DO NOT (the first four are non-negotiable):
✗✗✗ REPLACE the customer's face, hair, or body with the catalogue model's face, hair, or body — this destroys the customer's identity and is the most severe failure mode
✗✗✗ ADD A SECOND PERSON to the output. The customer is alone in Image 1 → the customer is alone in the output. Never paint the catalogue model standing next to her, behind her, in the mirror, in the background, or anywhere else. One person in, one person out.
✗✗✗ Drop the catalogue model into the customer's background — the output is the CUSTOMER wearing the new clothes, not the model standing where the customer used to stand
✗✗✗ Generate a face, hairline, eye color, skin tone, or body shape that doesn't match Image 1 — every facial feature must come from the customer
✗ Output a collage, grid, mosaic, side-by-side composition, before/after, or any multi-panel layout
✗ Output a product-catalogue style image showing the garments without the person
✗ Output the garment images unchanged or composited next to the customer photo
✗ Modify face, neck, body proportions, or perspective
✗ Roll up, fold, cuff, or change sleeve/leg lengths
✗ Alter, add, or invent logos, text, or branding not in garment images
✗ Add tattoos, jewelry, watches, glasses, or accessories not in Image 1
✗ Generate elements not present in any source image
✗ Mix or blend garment designs — each garment must remain visually distinct
✗ Change the garment's color, pattern, or texture from what's shown in the product image
✗ Make the garment look like a flat overlay — it must wrap around the 3D body naturally
✗ Use any piece of clothing from a reference photo OTHER than the one named for that image — if a bottoms reference shows a model also wearing a top, that top is OFF-LIMITS; you must render ONLY the stated top from its own image
✗ Substitute one garment for another because it looks nicer or more photogenic in the reference shot — always honour the stated label and name
✗ Layer the new garment ON TOP of the customer's original clothing in the same zone — replacement only, never stacking. No fragment of the original garment (color, fabric, hem, print, logo, neckline) may remain visible under or around the new garment
✗ Leave the original neckline, sleeves, hemline, or waistband of the customer's existing clothing showing as a "ghost" outline through or beside the new garment

QUALITY STANDARDS:
- Photorealistic output indistinguishable from a real photograph
- Natural fabric behavior appropriate to each garment's material
- Proper occlusion: garments behind/in front of arms, hair, body parts, and each other
- Consistent lighting and shadow across all garments matching Image 1
- Visible stitching, seams, buttons, and zippers preserved from garment images

OUTPUT FORMAT:
- Output image MUST have the EXACT same resolution and aspect ratio as Image 1
- Keep the full body visible — do not crop any part of the person
- Preserve the exact framing, composition, and camera angle of Image 1

Generate a SINGLE final photograph (not a collage, not panels, not a grid) that shows the person from Image 1 wearing all %d garment%s. The result must look like one photo taken in one moment — same framing, same background, same camera, same person — only the clothes are new.`,
		strings.Join(descriptions, "\n"),
		bodySection,
		strings.Join(fitRules, "\n"),
		layering,
		garmentCount,
		plural,
	)
}

func (s *TryOnService) fitResultToModel(ctx context.Context, modelPhotoURL string, resultBytes []byte, ext string) ([]byte, string) {
	req, err := http.NewRequestWithContext(ctx, "GET", modelPhotoURL, nil)
	if err != nil {
		logger.Warn("tryon", "fit result: create request failed", "error", err)
		return resultBytes, ext
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Warn("tryon", "fit result: download model photo failed", "error", err)
		return resultBytes, ext
	}
	modelBytes, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		logger.Warn("tryon", "fit result: read model photo failed", "error", err)
		return resultBytes, ext
	}

	cfg, _, err := image.DecodeConfig(bytes.NewReader(modelBytes))
	if err != nil || cfg.Width == 0 || cfg.Height == 0 {
		logger.Warn("tryon", "fit result: decode model config failed", "error", err)
		return resultBytes, ext
	}

	fitted, fittedExt, err := fitToAspectRatio(resultBytes, ext, cfg.Width, cfg.Height)
	if err != nil {
		logger.Warn("tryon", "fit result: fit failed", "error", err)
		return resultBytes, ext
	}
	return fitted, fittedExt
}

// fitToAspectRatio adjusts the result image to match the source aspect ratio
// using LETTERBOXING (scale-down + padding) instead of CENTER-CROPPING.
//
// The previous implementation (cropToAspectRatio) cut off content to make
// the result fit the source frame — which routinely chopped the customer's
// head off when Gemini returned a wider crop than the input portrait.
//
// New behaviour: scale the entire generated image to fit inside the target
// aspect ratio, and fill the leftover bands with white. This guarantees
// nothing the model produced is silently discarded — operators see the
// full generation, padding included, and can tell at a glance when Gemini
// returned a misframed result. Padding is white (matches our default
// background more naturally than black) and minimal when ratios match.
//
// EXCEPTION: if the source and result have OBVIOUSLY DIFFERENT orientations
// (e.g. landscape source vs portrait result — common with iPhone photos
// whose EXIF rotation we haven't applied), trust the result and skip
// padding entirely. Adding huge white bands on the sides of a portrait
// result just because the input came in landscape is much worse UX than
// returning the un-padded image.
func fitToAspectRatio(resultBytes []byte, ext string, srcW, srcH int) ([]byte, string, error) {
	img, _, err := image.Decode(bytes.NewReader(resultBytes))
	if err != nil {
		return nil, "", err
	}

	b := img.Bounds()
	resW, resH := b.Dx(), b.Dy()

	// Same aspect → nothing to do.
	// (use cross-product comparison to avoid float drift)
	if resW*srcH == srcW*resH {
		return resultBytes, ext, nil
	}

	// If orientations clearly differ (one is portrait, the other landscape),
	// the source ratio is not a reliable target — return the result as-is.
	// We treat anything within 5% of square as "ambiguous" (could go either
	// way), only reject when both images are decisively oriented and disagree.
	srcLandscape := srcW*100 > srcH*105
	srcPortrait := srcH*100 > srcW*105
	resLandscape := resW*100 > resH*105
	resPortrait := resH*100 > resW*105
	if (srcLandscape && resPortrait) || (srcPortrait && resLandscape) {
		return resultBytes, ext, nil
	}

	// Compute target canvas matching SOURCE aspect ratio.
	// Pick the larger of (resW, scaled-from-resH) so we never upscale below
	// the generation's resolution — keeps quality.
	var canvasW, canvasH int
	if resW*srcH > srcW*resH {
		// Result is wider than source aspect → keep width, grow height.
		canvasW = resW
		canvasH = resW * srcH / srcW
	} else {
		// Result is taller than source aspect → keep height, grow width.
		canvasH = resH
		canvasW = resH * srcW / srcH
	}

	// White background canvas.
	dst := image.NewRGBA(image.Rect(0, 0, canvasW, canvasH))
	white := image.NewUniform(image.White)
	draw.Draw(dst, dst.Bounds(), white, image.Point{}, draw.Src)

	// Center the generation inside the canvas.
	x0 := (canvasW - resW) / 2
	y0 := (canvasH - resH) / 2
	draw.Draw(dst, image.Rect(x0, y0, x0+resW, y0+resH), img, image.Point{}, draw.Src)

	var buf bytes.Buffer
	if ext == ".jpg" || ext == ".jpeg" {
		if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 95}); err != nil {
			return nil, "", err
		}
		return buf.Bytes(), ext, nil
	}
	if err := png.Encode(&buf, dst); err != nil {
		return nil, "", err
	}
	return buf.Bytes(), ".png", nil
}
