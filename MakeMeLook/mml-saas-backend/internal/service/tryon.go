package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
	"google.golang.org/genai"
)

var (
	ErrNoGarments           = errors.New("at least one product must be provided")
	ErrTooManyGarments      = errors.New("maximum 3 products allowed")
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
	repos   *repository.Repositories
	storage *StorageService
	cfg     *config.Config
	client  *http.Client
}

func NewTryOn(repos *repository.Repositories, storage *StorageService, cfg *config.Config) *TryOnService {
	return &TryOnService{
		repos:   repos,
		storage: storage,
		cfg:     cfg,
		client: &http.Client{
			Timeout: time.Duration(cfg.CometAPITimeoutSec) * time.Second,
		},
	}
}

// CleanupStuckJobs resets any processing try-ons left over from a previous server run.
func (s *TryOnService) CleanupStuckJobs(ctx context.Context) {
	if err := s.repos.LeadTryOn.MarkStuckAsError(ctx); err != nil {
		logger.Error("tryon", "cleanup stuck jobs failed", "error", err)
	}
}

// TryOn validates the request, creates a processing record, launches a background job and
// returns 202 immediately so the HTTP connection is not held open for the full CometAPI call.
func (s *TryOnService) TryOn(ctx context.Context, lead *model.Lead, req *dto.TryOnRequest) (*dto.TryOnAcceptedResponse, error) {
	if len(req.ProductIDs) == 0 {
		return nil, ErrNoGarments
	}
	if len(req.ProductIDs) > 3 {
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
	if count >= monthlyLimit {
		logger.Warn("tryon", "monthly limit exceeded", "lead_id", lead.ID, "count", count, "limit", monthlyLimit)
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
// HTTP disconnects. It calls CometAPI, uploads the result and updates the try-on record.
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

	startedAt := time.Now()
	aiLog := &model.AiApiLog{
		ProjectID:        projectID,
		LeadID:           &leadID,
		Model:            s.cfg.CometAPITryOnModel,
		Provider:         "google-gemini",
		RequestType:      "tryon",
		InputImagesCount: 1 + len(garments),
		Status:           model.AiApiLogStatusPending,
		StartedAt:        startedAt,
	}
	s.repos.AiApiLog.Create(ctx, aiLog)

	resultBytes, ext, retryCount, err := s.callGeminiAPI(ctx, modelPhotoURL, garments, body, aiLog)

	now := time.Now()
	latencyMs := int(time.Since(startedAt).Milliseconds())
	aiLog.LatencyMs = &latencyMs
	aiLog.FinishedAt = &now
	aiLog.RetryCount = retryCount

	if err != nil {
		aiLog.Status = model.AiApiLogStatusError
		errMsg := err.Error()
		aiLog.ErrorMessage = &errMsg
		s.repos.AiApiLog.Update(ctx, aiLog)
		logger.Error("tryon", "background job: CometAPI failed", "try_on_id", tryOnID, "retries", retryCount, "latency_ms", latencyMs, "error", err)
		s.failTryOn(tryOnID, err.Error())
		return
	}

	aiLog.Status = model.AiApiLogStatusSuccess
	s.repos.AiApiLog.Update(ctx, aiLog)

	resultBytes, ext = s.fitResultToModel(ctx, modelPhotoURL, resultBytes, ext)

	// Apply watermark
	resultBytes, ext = applyWatermark(resultBytes, ext)

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

		photoURL := ""
		if len(product.Photos) > 0 {
			photoURL = s.storage.GetObjectURL(photoBucket, product.Photos[0].ObjectKey)
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
		products = append(products, dto.TryOnProductInfo{
			ID:       p.PublicID.String(),
			Name:     p.Name,
			Category: cat,
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

func (s *TryOnService) callGeminiAPI(ctx context.Context, modelPhotoURL string, garments []tryOnGarment, body bodyContext, aiLog *model.AiApiLog) ([]byte, string, int, error) {
	if s.cfg.CometAPIKey == "" {
		logger.Error("tryon", "Gemini API key not configured")
		return nil, "", 0, errors.New("Gemini API key not configured")
	}

	// Load model image as raw bytes
	modelBytes, modelMime, err := s.loadImageBytes(ctx, modelPhotoURL)
	if err != nil {
		logger.Error("tryon", "load model photo failed", "url", modelPhotoURL, "error", err)
		return nil, "", 0, fmt.Errorf("load model photo: %w", err)
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
			return nil, "", 0, fmt.Errorf("load garment photo: %w", err)
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

	// Retry loop
	var lastErr error
	retryCount := 0
	for attempt := 1; attempt <= s.cfg.CometMaxRetries; attempt++ {
		imageBytes, ext, err := s.callGeminiOnce(ctx, modelBytes, modelMime, loaded, prompt)
		if err != nil {
			lastErr = err
			if attempt < s.cfg.CometMaxRetries {
				retryCount++
				delay := time.Duration(1<<uint(attempt-1)) * time.Second // exponential: 1s, 2s, 4s...
				logger.Warn("tryon", "Gemini API failed, retrying", "attempt", attempt, "delay", delay, "error", err)
				select {
				case <-time.After(delay):
				case <-ctx.Done():
					return nil, "", retryCount, ctx.Err()
				}
				continue
			}
			logger.Error("tryon", "Gemini API failed", "attempt", attempt, "error", err)
			return nil, "", retryCount, fmt.Errorf("Gemini API: %w", err)
		}
		return imageBytes, ext, retryCount, nil
	}

	logger.Error("tryon", "Gemini API failed after all retries", "retries", s.cfg.CometMaxRetries, "error", lastErr)
	return nil, "", retryCount, fmt.Errorf("Gemini API failed after %d retries: %w", s.cfg.CometMaxRetries, lastErr)
}

// callGeminiOnce performs a single Gemini API call and extracts the image from the response.
func (s *TryOnService) callGeminiOnce(ctx context.Context, modelBytes []byte, modelMime string, garments []loadedGarment, prompt string) ([]byte, string, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  s.cfg.CometAPIKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, "", fmt.Errorf("create genai client: %w", err)
	}

	var parts []*genai.Part

	// Add model photo
	parts = append(parts, genai.NewPartFromBytes(modelBytes, modelMime))

	// Add garment photos
	for _, g := range garments {
		parts = append(parts, genai.NewPartFromBytes(g.data, g.mimeType))
	}

	// Add text prompt
	parts = append(parts, genai.NewPartFromText(prompt))

	contents := []*genai.Content{
		{Role: "user", Parts: parts},
	}

	// Generate with image output
	result, err := client.Models.GenerateContent(ctx, s.cfg.CometAPITryOnModel, contents, &genai.GenerateContentConfig{
		ResponseModalities: []string{"IMAGE", "TEXT"},
	})
	if err != nil {
		return nil, "", fmt.Errorf("generate content: %w", err)
	}

	if result == nil || len(result.Candidates) == 0 || result.Candidates[0].Content == nil {
		return nil, "", errors.New("empty response from Gemini API")
	}

	// Extract image from response parts
	for _, part := range result.Candidates[0].Content.Parts {
		if part.InlineData != nil && strings.HasPrefix(part.InlineData.MIMEType, "image/") {
			ext := extFromMime(part.InlineData.MIMEType)
			return part.InlineData.Data, ext, nil
		}
	}

	return nil, "", errors.New("no image found in Gemini API response")
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
	req, err := http.NewRequestWithContext(ctx, "GET", imageURL, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	data, err := io.ReadAll(resp.Body)
	if closeErr := resp.Body.Close(); closeErr != nil {
		logger.Warn("tryon", "close image response body failed", "url", imageURL, "error", closeErr)
	}
	if err != nil {
		return nil, "", err
	}

	mime := resp.Header.Get("Content-Type")
	if mime == "" {
		mime = "image/jpeg"
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
Use these measurements to determine how the garments should FIT on this person's body.
Larger body relative to garment = tighter fit with more stretch and body-conforming silhouette.
Smaller body relative to garment = looser fit with more drape and fabric volume.`, strings.Join(bodyLines, "\n"))
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

INPUT:
- Image 1: CUSTOMER PHOTO — this is the ONLY person. Preserve their face, body, pose, and background. Dress THIS person.
%s
CRITICAL: Image 1 is ALWAYS the customer. Images 2+ are ONLY clothing references — extract the garment design from them but IGNORE any person/model wearing the garment. The output must show the person from Image 1 wearing the extracted garments.
%s
STRICT PRESERVATION RULES:
□ Face: 100%% identical — features, expression, skin texture, hair
□ Body: Same pose, proportions, visible body parts unchanged
□ Background: Keep all pixels outside the clothing area identical
□ Lighting: Match the ambient light direction, intensity, and color temperature from Image 1
□ Anatomy: Maintain exact neck, shoulders, arms, and hands — no distortion

GARMENT APPLICATION:
%s
□ Extract the EXACT clothing design, pattern, color, texture, and construction details from each garment image
□ Warp each garment to naturally conform to the person's body contours and pose
□ Preserve the garment's original proportions — sleeve length, body length, collar shape, pocket placement
□ Generate realistic fabric physics: natural folds at elbows, knees, waist; gravity-appropriate draping
□ Apply consistent shadows and ambient occlusion where garments contact the body
□ Blend garment edges seamlessly with preserved skin and background
□ Maintain the garment's original fit silhouette from the product image — do not make it tighter or looser than shown
%s
FORBIDDEN — DO NOT:
✗ Modify face, neck, body proportions, or perspective
✗ Roll up, fold, cuff, or change sleeve/leg lengths
✗ Alter, add, or invent logos, text, or branding not in garment images
✗ Add tattoos, jewelry, watches, glasses, or accessories not in Image 1
✗ Generate elements not present in any source image
✗ Mix or blend garment designs — each garment must remain visually distinct
✗ Change the garment's color, pattern, or texture from what's shown in the product image
✗ Make the garment look like a flat overlay — it must wrap around the 3D body naturally

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

Generate single final image with all %d garment%s applied.`,
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

	cropped, croppedExt, err := cropToAspectRatio(resultBytes, ext, cfg.Width, cfg.Height)
	if err != nil {
		logger.Warn("tryon", "fit result: crop failed", "error", err)
		return resultBytes, ext
	}
	return cropped, croppedExt
}

func cropToAspectRatio(resultBytes []byte, ext string, srcW, srcH int) ([]byte, string, error) {
	img, _, err := image.Decode(bytes.NewReader(resultBytes))
	if err != nil {
		return nil, "", err
	}

	b := img.Bounds()
	resW, resH := b.Dx(), b.Dy()

	var cropW, cropH int
	if resW*srcH > srcW*resH {
		cropH = resH
		cropW = resH * srcW / srcH
	} else {
		cropW = resW
		cropH = resW * srcH / srcW
	}

	if cropW == resW && cropH == resH {
		return resultBytes, ext, nil
	}

	x0 := (resW - cropW) / 2
	y0 := (resH - cropH) / 2

	dst := image.NewRGBA(image.Rect(0, 0, cropW, cropH))
	draw.Draw(dst, dst.Bounds(), img, image.Pt(x0, y0), draw.Src)

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

