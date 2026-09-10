package service

import (
	"context"
	"fmt"
	"net/url"
	"strings"
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

// NormalizeDomainForWhitelist coerces user input into the canonical form
// the widget middleware expects (lowercase bare host, no scheme, no path,
// no port, no trailing slash). Examples:
//
//	"https://Example.com/"        → "example.com"
//	"http://example.com:8080/foo" → "example.com"
//	"  EXAMPLE.com  "             → "example.com"
//	"example.com"                 → "example.com"
//
// Returns "" if the input doesn't contain any usable host. Exported because
// installation diagnostics also need to defend against legacy rows that
// were saved before this normalization was in place.
func NormalizeDomainForWhitelist(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}

	// url.Parse only recognizes a scheme if it's present; for bare hosts
	// like "example.com:80/foo" it puts everything in Path. Add a scheme
	// when we don't see one so Hostname() works in both cases.
	if !strings.Contains(s, "://") {
		s = "//" + s
	}
	u, err := url.Parse(s)
	if err != nil || u.Hostname() == "" {
		// Fallback: strip what we can manually. Better to keep something
		// the user typed than to refuse — middleware will simply not
		// match it and the operator can fix it.
		s = strings.TrimPrefix(strings.TrimPrefix(raw, "https://"), "http://")
		s = strings.TrimRight(s, "/")
		if i := strings.Index(s, "/"); i >= 0 {
			s = s[:i]
		}
		if i := strings.Index(s, ":"); i >= 0 {
			s = s[:i]
		}
		return strings.ToLower(strings.TrimSpace(s))
	}
	return strings.ToLower(u.Hostname())
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

	// Normalize before any DB work. The widget-side middleware compares
	// against parsed.Hostname() (lowercase host, no scheme, no path,
	// no port), so anything else stored here just won't match Origin
	// at runtime and we'd silently 403 every legit request.
	normalized := NormalizeDomainForWhitelist(req.Domain)
	if normalized == "" {
		return nil, fmt.Errorf("domain is empty after normalization")
	}

	// Check if domain exists
	exists, err := s.repos.ProjectDomain.ExistsByProjectAndDomain(ctx, projectID, normalized)
	if err != nil {
		return nil, fmt.Errorf("check domain exists: %w", err)
	}
	if exists {
		return nil, ErrDomainExists
	}

	// Create domain (unverified for MVP)
	domain := &model.ProjectDomain{
		ProjectID:  projectID,
		Domain:     normalized,
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
