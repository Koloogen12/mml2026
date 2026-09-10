package service

import (
	"context"
	"fmt"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
)

type ProjectDomainService struct {
	repos *repository.Repositories
}

func NewProjectDomain(repos *repository.Repositories) *ProjectDomainService {
	return &ProjectDomainService{repos: repos}
}

// List domains
func (s *ProjectDomainService) ListDomains(ctx context.Context, userID int, projectID int) (*dto.DomainsListResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	domains, err := s.repos.ProjectDomain.ListByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("list domains: %w", err)
	}

	dtos := make([]dto.DomainResponse, len(domains))
	for i, d := range domains {
		dtos[i] = s.domainToDTO(d)
	}

	return &dto.DomainsListResponse{Domains: dtos}, nil
}

// Add domain
func (s *ProjectDomainService) AddDomain(ctx context.Context, userID int, projectID int, req dto.AddDomainRequest) (*dto.DomainResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// Check if domain exists
	exists, err := s.repos.ProjectDomain.ExistsByProjectAndDomain(ctx, projectID, req.Domain)
	if err != nil {
		return nil, fmt.Errorf("check domain exists: %w", err)
	}
	if exists {
		return nil, ErrDomainExists
	}

	// Create domain (unverified for MVP)
	domain := &model.ProjectDomain{
		ProjectID:  projectID,
		Domain:     req.Domain,
		IsVerified: false,
	}

	if err := s.repos.ProjectDomain.Create(ctx, domain); err != nil {
		return nil, fmt.Errorf("create domain: %w", err)
	}

	resp := s.domainToDTO(domain)
	return &resp, nil
}

// Delete domain
func (s *ProjectDomainService) DeleteDomain(ctx context.Context, userID int, projectID int, domainID int) error {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return ErrProjectNotFound
	}

	domain, err := s.repos.ProjectDomain.GetByID(ctx, domainID)
	if err != nil {
		return fmt.Errorf("get domain: %w", err)
	}
	if domain == nil {
		return ErrProjectNotFound
	}

	// Cannot delete localhost
	if domain.IsLocalhost() {
		return ErrCannotDeleteLocalhost
	}

	// Delete with projectID check (atomic)
	affected, err := s.repos.ProjectDomain.Delete(ctx, domainID, projectID)
	if err != nil {
		return fmt.Errorf("delete domain: %w", err)
	}
	if affected == 0 {
		return ErrProjectNotFound
	}

	return nil
}

// Helper
func (s *ProjectDomainService) domainToDTO(d *model.ProjectDomain) dto.DomainResponse {
	var verifiedAt *string
	if d.VerifiedAt != nil {
		str := d.VerifiedAt.Format(time.RFC3339)
		verifiedAt = &str
	}

	return dto.DomainResponse{
		ID:         d.ID,
		Domain:     d.Domain,
		IsVerified: d.IsVerified,
		VerifiedAt: verifiedAt,
	}
}
