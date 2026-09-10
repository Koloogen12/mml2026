package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
)

type LeadAdminService struct {
	repos   *repository.Repositories
	storage *StorageService
	cfg     *config.Config
}

func NewLeadAdmin(repos *repository.Repositories, storage *StorageService, cfg *config.Config) *LeadAdminService {
	return &LeadAdminService{repos: repos, storage: storage, cfg: cfg}
}

// ListLeads returns paginated leads for a project.
func (s *LeadAdminService) ListLeads(ctx context.Context, userID int, projectID int, filter repository.LeadListFilter) (*dto.AdminLeadListResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	filter.ProjectID = projectID

	leads, err := s.repos.Lead.ListByProjectID(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("list leads: %w", err)
	}

	total, err := s.repos.Lead.CountByProjectID(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("count leads: %w", err)
	}

	dtos := make([]dto.AdminLeadResponse, len(leads))
	for i, l := range leads {
		dtos[i] = s.leadToDTO(&l.Lead, l.TryOnCount)
	}

	return &dto.AdminLeadListResponse{
		Leads:  dtos,
		Total:  int(total),
		Offset: filter.Offset,
		Limit:  filter.Limit,
	}, nil
}

// GetLeadDetail returns full lead data with associations.
func (s *LeadAdminService) GetLeadDetail(ctx context.Context, userID int, projectID int, leadID int64) (*dto.AdminLeadDetailResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	lead, err := s.repos.Lead.GetDetailByID(ctx, leadID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get lead: %w", err)
	}
	if lead == nil {
		return nil, ErrLeadNotFound
	}

	// Fetch try-ons separately with product preloading
	tryOns, err := s.repos.LeadTryOn.ListByLeadID(ctx, lead.ID)
	if err != nil {
		return nil, fmt.Errorf("list try-ons: %w", err)
	}

	resp := &dto.AdminLeadDetailResponse{
		AdminLeadResponse: s.leadToDTO(lead, len(tryOns)),
		Photos:            s.photosToDTO(lead.Photos),
		TryOns:            s.tryOnsToDTO(tryOns),
		Favorites:         s.favoritesToDTO(lead.Favorites),
		CartItems:         s.cartItemsToDTO(lead.CartItems),
	}

	return resp, nil
}

// GetTryOnHistory returns try-on history for a lead.
func (s *LeadAdminService) GetTryOnHistory(ctx context.Context, userID int, projectID int, leadID int64) ([]dto.AdminLeadTryOnResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	// Verify lead belongs to project
	lead, err := s.repos.Lead.GetByID(ctx, leadID)
	if err != nil {
		return nil, fmt.Errorf("get lead: %w", err)
	}
	if lead == nil || lead.ProjectID != projectID {
		return nil, ErrLeadNotFound
	}

	tryOns, err := s.repos.LeadTryOn.ListByLeadID(ctx, leadID)
	if err != nil {
		return nil, fmt.Errorf("list try-ons: %w", err)
	}

	return s.tryOnsToDTO(tryOns), nil
}

// ExportCSV generates a CSV export of leads.
func (s *LeadAdminService) ExportCSV(ctx context.Context, userID int, projectID int, filter repository.LeadListFilter) ([]byte, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	filter.ProjectID = projectID
	filter.Offset = 0
	filter.Limit = 10000 // reasonable max for CSV export

	leads, err := s.repos.Lead.ListByProjectID(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("list leads: %w", err)
	}

	var buf bytes.Buffer
	buf.WriteString("ID,Email,Gender,Size,Height,Weight,Chest,Waist,Hip,Figure Type,Belly Shape,Try-ons,Visit Count,First Visit,Last Visit,Created At\n")

	for _, l := range leads {
		fmt.Fprintf(&buf, "%d,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%d,%d,%s,%s,%s\n",
			l.ID,
			csvVal(l.Email),
			csvVal(l.Gender),
			csvVal(l.Size),
			csvIntVal(l.Height),
			csvIntVal(l.Weight),
			csvIntVal(l.Chest),
			csvIntVal(l.Waist),
			csvIntVal(l.Hip),
			csvVal(l.FigureType),
			csvVal(l.BellyShape),
			l.TryOnCount,
			l.VisitCount,
			l.FirstVisitAt.Format(time.RFC3339),
			l.LastVisitAt.Format(time.RFC3339),
			l.CreatedAt.Format(time.RFC3339))
	}

	return buf.Bytes(), nil
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func (s *LeadAdminService) requireProjectAccess(ctx context.Context, userID int, projectID int) (*model.Project, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}
	return project, nil
}

func (s *LeadAdminService) leadToDTO(l *model.Lead, tryOnCount int) dto.AdminLeadResponse {
	r := dto.AdminLeadResponse{
		ID:           l.ID,
		ProjectID:    l.ProjectID,
		SessionToken: l.SessionToken.String(),
		Gender:       l.Gender,
		Height:       l.Height,
		Weight:       l.Weight,
		Chest:        l.Chest,
		Waist:        l.Waist,
		Hip:          l.Hip,
		Size:         l.Size,
		BellyShape:   l.BellyShape,
		FigureType:   l.FigureType,
		Email:        l.Email,
		IP:           l.IP,
		UserAgent:    l.UserAgent,
		FirstVisitAt: l.FirstVisitAt.Format(time.RFC3339),
		LastVisitAt:  l.LastVisitAt.Format(time.RFC3339),
		VisitCount:   l.VisitCount,
		TryOnCount:   tryOnCount,
		CreatedAt:    l.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    l.UpdatedAt.Format(time.RFC3339),
	}

	if l.DeviceInfo != nil {
		var di map[string]any
		if json.Unmarshal(l.DeviceInfo, &di) == nil {
			r.DeviceInfo = di
		}
	}

	return r
}

func (s *LeadAdminService) photosToDTO(photos []model.LeadPhoto) []dto.AdminLeadPhotoResponse {
	result := make([]dto.AdminLeadPhotoResponse, len(photos))
	for i, p := range photos {
		result[i] = dto.AdminLeadPhotoResponse{
			ID:        p.ID,
			PublicID:  p.PublicID.String(),
			URL:       s.storage.GetObjectURL(s.cfg.MinioBucket, p.ObjectKey),
			Type:      p.Type,
			CreatedAt: p.CreatedAt.Format(time.RFC3339),
		}
	}
	return result
}

func (s *LeadAdminService) tryOnsToDTO(tryOns []*model.LeadTryOn) []dto.AdminLeadTryOnResponse {
	result := make([]dto.AdminLeadTryOnResponse, len(tryOns))
	for i, t := range tryOns {
		resultURL := ""
		if t.ResultKey != nil {
			resultURL = s.storage.GetObjectURL(s.cfg.MinioBucket, *t.ResultKey)
		}
		r := dto.AdminLeadTryOnResponse{
			ID:        t.ID,
			PublicID:  t.PublicID.String(),
			ResultURL: resultURL,
			CreatedAt: t.CreatedAt.Format(time.RFC3339),
		}
		if t.OuterwearProduct != nil {
			r.OuterwearProduct = s.productToTryOnDTO(t.OuterwearProduct)
		}
		if t.TopsProduct != nil {
			r.TopsProduct = s.productToTryOnDTO(t.TopsProduct)
		}
		if t.BottomsProduct != nil {
			r.BottomsProduct = s.productToTryOnDTO(t.BottomsProduct)
		}
		result[i] = r
	}
	return result
}

func (s *LeadAdminService) productToTryOnDTO(p *model.Product) *dto.AdminLeadTryOnProductResponse {
	r := &dto.AdminLeadTryOnProductResponse{
		ID:       p.ID,
		Name:     p.Name,
		Category: p.Category,
	}
	if len(p.Photos) > 0 {
		url := s.storage.GetObjectURL("product-photos", p.Photos[0].ObjectKey)
		r.PhotoURL = &url
	}
	return r
}

func (s *LeadAdminService) favoritesToDTO(favs []model.LeadFavorite) []dto.AdminLeadFavoriteResponse {
	result := make([]dto.AdminLeadFavoriteResponse, len(favs))
	for i, f := range favs {
		result[i] = dto.AdminLeadFavoriteResponse{
			ID:        f.ID,
			PublicID:  f.PublicID.String(),
			ImageURL:  s.storage.GetObjectURL(s.cfg.MinioBucket, f.ImageKey),
			TryOnID:   f.TryOnID,
			CreatedAt: f.CreatedAt.Format(time.RFC3339),
		}
	}
	return result
}

func (s *LeadAdminService) cartItemsToDTO(items []model.LeadCartItem) []dto.AdminLeadCartItemResponse {
	result := make([]dto.AdminLeadCartItemResponse, len(items))
	for i, item := range items {
		r := dto.AdminLeadCartItemResponse{
			ID:        item.ID,
			PublicID:  item.PublicID.String(),
			TryOnID:   item.TryOnID,
			CreatedAt: item.CreatedAt.Format(time.RFC3339),
		}
		if item.Product != nil {
			r.Product = s.productToTryOnDTO(item.Product)
		}
		result[i] = r
	}
	return result
}

func csvVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func csvIntVal(v *int) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%d", *v)
}
