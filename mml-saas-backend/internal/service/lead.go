package service

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"

	"github.com/google/uuid"
)

// ErrSessionNotFound is declared in auth.go

type LeadService struct {
	repos        *repository.Repositories
	storage      *StorageService
	bucket       string
	widgetAPISvc *WidgetAPIService
	cfg          *config.Config
}

func NewLead(repos *repository.Repositories, storage *StorageService, bucket string, widgetAPISvc *WidgetAPIService, cfg *config.Config) *LeadService {
	return &LeadService{
		repos:        repos,
		storage:      storage,
		bucket:       bucket,
		widgetAPISvc: widgetAPISvc,
		cfg:          cfg,
	}
}

// CreateSession creates a new lead (widget session) and returns session + widget config.
func (s *LeadService) CreateSession(ctx context.Context, req *dto.CreateSessionRequest) (*dto.SessionWithConfigResponse, error) {
	projectPublicID, err := uuid.Parse(req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("invalid project_id: %w", err)
	}

	project, err := s.repos.Project.GetByPublicID(ctx, projectPublicID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// Refuse to create a session for paused projects. The loader handles
	// 403 silently and skips widget injection, so paused projects truly
	// disappear from the customer's site without breaking the page.
	if project.IsPaused() {
		return nil, ErrProjectPaused
	}

	// Domain verification (skip in development and for localhost)
	if !s.cfg.IsDevelopment() {
		if err := s.verifyOrigin(ctx, project.ID, req.Origin); err != nil {
			return nil, err
		}
	}

	now := time.Now()
	lead := &model.Lead{
		ProjectID:    project.ID,
		Gender:       req.Gender,
		Height:       req.Height,
		Weight:       req.Weight,
		Chest:        req.Chest,
		Waist:        req.Waist,
		Hip:          req.Hip,
		Size:         req.Size,
		BellyShape:   req.BellyShape,
		FigureType:   req.FigureType,
		IP:           &req.IP,
		UserAgent:    &req.UserAgent,
		FirstVisitAt: now,
		LastVisitAt:  now,
		VisitCount:   1,
	}

	if err := s.repos.Lead.Create(ctx, lead); err != nil {
		return nil, fmt.Errorf("create lead: %w", err)
	}

	cfg, err := s.widgetAPISvc.GetConfigByProjectInternalID(ctx, project.ID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}

	return &dto.SessionWithConfigResponse{
		SessionResponse: *s.buildSessionResponse(lead),
		Config:          *cfg,
	}, nil
}

// UpdateSession updates lead body parameters and visit tracking.
func (s *LeadService) UpdateSession(ctx context.Context, token uuid.UUID, req *dto.UpdateSessionRequest) (*dto.SessionResponse, error) {
	lead, err := s.repos.Lead.GetBySessionToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("get lead: %w", err)
	}
	if lead == nil {
		return nil, ErrSessionNotFound
	}

	updates := map[string]any{
		"last_visit_at": time.Now(),
		"visit_count":   lead.VisitCount + 1,
	}

	if req.Gender != nil {
		updates["gender"] = *req.Gender
	}
	if req.Height != nil {
		updates["height"] = *req.Height
	}
	if req.Weight != nil {
		updates["weight"] = *req.Weight
	}
	if req.Chest != nil {
		updates["chest"] = *req.Chest
	}
	if req.Waist != nil {
		updates["waist"] = *req.Waist
	}
	if req.Hip != nil {
		updates["hip"] = *req.Hip
	}
	if req.Size != nil {
		updates["size"] = *req.Size
	}
	if req.BellyShape != nil {
		updates["belly_shape"] = *req.BellyShape
	}
	if req.FigureType != nil {
		updates["figure_type"] = *req.FigureType
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}

	if err := s.repos.Lead.UpdateParams(ctx, lead.ID, updates); err != nil {
		return nil, fmt.Errorf("update lead: %w", err)
	}

	// Re-fetch to get updated values
	lead, err = s.repos.Lead.GetBySessionToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("get updated lead: %w", err)
	}

	return s.buildSessionResponse(lead), nil
}

// GetSession returns session data + widget config. Used by the loader on page reload.
func (s *LeadService) GetSession(ctx context.Context, token uuid.UUID) (*dto.SessionWithConfigResponse, error) {
	lead, err := s.repos.Lead.GetBySessionToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("get lead: %w", err)
	}
	if lead == nil {
		return nil, ErrSessionNotFound
	}

	// If the project was paused after this session was created, refuse to
	// hand back the session. The loader will see 403, drop the cached
	// session token, and silently stop showing the widget on next load.
	project, err := s.repos.Project.GetByID(ctx, lead.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}
	if project.IsPaused() {
		return nil, ErrProjectPaused
	}

	sessionResp := s.buildSessionResponse(lead)

	// Attach latest model photo
	photos, err := s.repos.LeadPhoto.ListByLeadID(ctx, lead.ID)
	if err == nil && len(photos) > 0 {
		latest := photos[0]
		photoID := latest.PublicID.String()
		photoURL := s.storage.GetObjectURL(s.bucket, latest.ObjectKey)
		sessionResp.ModelPhotoID = &photoID
		sessionResp.ModelPhotoURL = &photoURL
	}

	// Attach latest try-on (any status) so the widget can restore or resume polling
	lastTryOn, err := s.repos.LeadTryOn.GetLatestByLeadID(ctx, lead.ID)
	if err == nil && lastTryOn != nil {
		resp := &dto.TryOnStatusResponse{
			PublicID: lastTryOn.PublicID.String(),
			Status:   string(lastTryOn.Status),
		}
		if lastTryOn.Status == model.TryOnStatusDone && lastTryOn.ResultKey != nil {
			resp.ResultURL = s.storage.GetObjectURL(s.bucket, *lastTryOn.ResultKey)
			resp.ResultKey = *lastTryOn.ResultKey
			resp.Products = s.tryOnProducts(lastTryOn)
		}
		sessionResp.LastTryOn = resp
	}

	cfg, err := s.widgetAPISvc.GetConfigByProjectInternalID(ctx, lead.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}

	return &dto.SessionWithConfigResponse{
		SessionResponse: *sessionResp,
		Config:          *cfg,
	}, nil
}

// GetLeadByToken returns the lead model for internal use (e.g., by try-on service).
func (s *LeadService) GetLeadByToken(ctx context.Context, token uuid.UUID) (*model.Lead, error) {
	lead, err := s.repos.Lead.GetBySessionToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("get lead: %w", err)
	}
	if lead == nil {
		return nil, ErrSessionNotFound
	}
	return lead, nil
}

// DeleteSession soft-deletes a lead session.
func (s *LeadService) DeleteSession(ctx context.Context, token uuid.UUID) error {
	if err := s.repos.Lead.SoftDelete(ctx, token); err != nil {
		return fmt.Errorf("soft delete lead: %w", err)
	}
	return nil
}

// RecordConsent persists an explicit user consent for personal data processing
// (biometric data per Art. 11 of 152-ФЗ). Stores IP, UA, policy version, and
// timestamp so we can prove consent was given under the specific policy wording.
func (s *LeadService) RecordConsent(ctx context.Context, lead *model.Lead, token uuid.UUID, req *dto.RecordConsentRequest, ip, userAgent string) (*dto.RecordConsentResponse, error) {
	locale := req.Locale
	if locale == "" {
		locale = "ru"
	}

	log := &model.ConsentLog{
		ProjectID:     lead.ProjectID,
		LeadID:        &lead.ID,
		SessionToken:  token.String(),
		PolicyType:    req.PolicyType,
		PolicyVersion: req.PolicyVersion,
		Locale:        locale,
		ConsentedAt:   time.Now(),
		IP:            ip,
		UserAgent:     userAgent,
	}
	if err := s.repos.ConsentLog.Create(ctx, log); err != nil {
		return nil, fmt.Errorf("create consent log: %w", err)
	}

	return &dto.RecordConsentResponse{
		ID:          fmt.Sprintf("%d", log.ID),
		ConsentedAt: log.ConsentedAt.Format(time.RFC3339),
	}, nil
}

// LeadPhotoCreate holds the data needed to create a lead photo record.
type LeadPhotoCreate struct {
	LeadID    int64
	ObjectKey string
	Type      string
}

// CreatePhoto creates a lead photo record.
func (s *LeadService) CreatePhoto(ctx context.Context, req *LeadPhotoCreate) (*dto.UploadPhotoResponse, error) {
	photo := &model.LeadPhoto{
		LeadID:    req.LeadID,
		ObjectKey: req.ObjectKey,
		Type:      req.Type,
	}
	if err := s.repos.LeadPhoto.Create(ctx, photo); err != nil {
		return nil, fmt.Errorf("create lead photo: %w", err)
	}
	return &dto.UploadPhotoResponse{
		ID:       fmt.Sprintf("%d", photo.ID),
		PublicID: photo.PublicID.String(),
		URL:      s.storage.GetObjectURL(s.bucket, photo.ObjectKey),
	}, nil
}

// verifyOrigin checks the request origin against the project's allowed domains.
func (s *LeadService) verifyOrigin(ctx context.Context, projectID int, origin string) error {
	requestHost := extractOriginHost(origin)

	// Always allow localhost and loopback
	if requestHost == "" || requestHost == "localhost" || strings.HasPrefix(requestHost, "127.0.0.") {
		return nil
	}

	domains, err := s.repos.ProjectDomain.ListByProjectID(ctx, projectID)
	if err != nil {
		return fmt.Errorf("list domains: %w", err)
	}

	for _, d := range domains {
		if d.Domain == requestHost || strings.HasSuffix(requestHost, "."+d.Domain) {
			return nil
		}
	}

	return ErrDomainNotAllowed
}

func extractOriginHost(origin string) string {
	if origin == "" {
		return ""
	}
	parsed, err := url.Parse(origin)
	if err != nil {
		return origin
	}
	host := parsed.Hostname()
	if host == "" {
		return origin
	}
	return host
}

func (s *LeadService) tryOnProducts(t *model.LeadTryOn) []dto.TryOnProductInfo {
	var products []dto.TryOnProductInfo
	for _, p := range []*model.Product{t.OuterwearProduct, t.TopsProduct, t.BottomsProduct} {
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

func (s *LeadService) buildSessionResponse(lead *model.Lead) *dto.SessionResponse {
	resp := &dto.SessionResponse{
		SessionToken:    lead.SessionToken.String(),
		IsAuthenticated: lead.IsAuthenticated,
	}
	if lead.Gender != nil {
		resp.Gender = *lead.Gender
	}
	if lead.Height != nil {
		resp.Height = *lead.Height
	}
	if lead.Weight != nil {
		resp.Weight = *lead.Weight
	}
	if lead.Chest != nil {
		resp.Chest = *lead.Chest
	}
	if lead.Waist != nil {
		resp.Waist = *lead.Waist
	}
	if lead.Hip != nil {
		resp.Hip = *lead.Hip
	}
	if lead.Size != nil {
		resp.Size = *lead.Size
	}
	if lead.BellyShape != nil {
		resp.BellyShape = *lead.BellyShape
	}
	if lead.FigureType != nil {
		resp.FigureType = *lead.FigureType
	}
	if lead.Email != nil {
		resp.Email = *lead.Email
	}
	if lead.Phone != nil {
		resp.Phone = *lead.Phone
	}
	return resp
}
