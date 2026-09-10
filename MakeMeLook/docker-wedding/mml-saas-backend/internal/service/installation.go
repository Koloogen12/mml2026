package service

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"mml-saas-backend/assets"
	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/util"

	"golang.org/x/net/html"
)

type InstallationService struct {
	repos  *repository.Repositories
	cfg    *config.Config
	client *http.Client
}

func NewInstallation(repos *repository.Repositories, cfg *config.Config) *InstallationService {
	return &InstallationService{
		repos: repos,
		cfg:   cfg,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetWidgetCode generates the embed snippet for a project.
func (s *InstallationService) GetWidgetCode(ctx context.Context, userID, projectID int) (*dto.WidgetCodeResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	cdnURL := s.cfg.WidgetCDNURL
	publicID := project.PublicID.String()

	snippet := fmt.Sprintf(`<!-- MakeMeLook Virtual Try-On Widget -->
<script
  src="%s/loader.js"
  data-project="%s"
  async
></script>`, cdnURL, publicID)

	return &dto.WidgetCodeResponse{
		Snippet:   snippet,
		ProjectID: publicID,
		CDNUrl:    cdnURL,
	}, nil
}

// GetReadiness returns installation readiness status.
func (s *InstallationService) GetReadiness(ctx context.Context, userID, projectID int) (*dto.ReadinessResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// Widget configured
	status, err := s.repos.Project.GetOnboardingStatus(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get onboarding: %w", err)
	}
	widgetConfigured := status.WidgetConfigured

	// Products
	isActive := true
	totalCount, err := s.repos.Product.Count(ctx, repository.ProductListFilter{
		ProjectID: projectID,
		Limit:     1,
	})
	if err != nil {
		return nil, fmt.Errorf("count products: %w", err)
	}
	activeCount, err := s.repos.Product.Count(ctx, repository.ProductListFilter{
		ProjectID: projectID,
		IsActive:  &isActive,
		Limit:     1,
	})
	if err != nil {
		return nil, fmt.Errorf("count active products: %w", err)
	}

	// Domains (non-localhost)
	domains, err := s.repos.ProjectDomain.ListByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("list domains: %w", err)
	}
	hasDomain := false
	for _, d := range domains {
		if !d.IsLocalhost() {
			hasDomain = true
			break
		}
	}

	allReady := widgetConfigured && totalCount >= 5 && hasDomain

	return &dto.ReadinessResponse{
		WidgetConfigured: widgetConfigured,
		ProductsCount:    int(totalCount),
		ActiveProducts:   int(activeCount),
		HasDomain:        hasDomain,
		AllReady:         allReady,
	}, nil
}

// RunDiagnostics runs diagnostic checks for all domains of a project.
func (s *InstallationService) RunDiagnostics(ctx context.Context, userID, projectID int) (*dto.DiagnosticsResponse, error) {
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

	publicID := project.PublicID.String()
	resp := &dto.DiagnosticsResponse{Domains: make([]dto.DomainDiagnostics, 0)}

	for _, domain := range domains {
		if domain.IsLocalhost() {
			continue
		}
		diag := s.checkDomain(ctx, projectID, domain.Domain, publicID)
		resp.Domains = append(resp.Domains, diag)
	}

	return resp, nil
}

// GetDiagnostics returns the latest diagnostics results for a project.
func (s *InstallationService) GetDiagnostics(ctx context.Context, userID, projectID int) (*dto.DiagnosticsResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	results, err := s.repos.DiagnosticResult.GetLatestByProject(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get diagnostics: %w", err)
	}

	resp := &dto.DiagnosticsResponse{Domains: make([]dto.DomainDiagnostics, 0, len(results))}
	for _, r := range results {
		checkedAt := r.CheckedAt.Format(time.RFC3339)
		checks := make([]dto.DiagnosticCheck, len(r.Checks))
		for i, c := range r.Checks {
			checks[i] = dto.DiagnosticCheck{
				Name:    c.Name,
				Status:  c.Status,
				Message: c.Message,
				Detail:  c.Detail,
			}
		}
		resp.Domains = append(resp.Domains, dto.DomainDiagnostics{
			Domain:    r.Domain,
			CheckedAt: &checkedAt,
			Status:    r.Status,
			Checks:    checks,
		})
	}

	return resp, nil
}

// RunDiagnosticsForProject runs diagnostics without ownership check (for cron).
func (s *InstallationService) RunDiagnosticsForProject(ctx context.Context, projectID int) {
	project, err := s.repos.Project.GetByID(ctx, projectID)
	if err != nil || project == nil {
		return
	}

	domains, err := s.repos.ProjectDomain.ListByProjectID(ctx, projectID)
	if err != nil {
		return
	}

	publicID := project.PublicID.String()
	for _, domain := range domains {
		if domain.IsLocalhost() {
			continue
		}
		s.checkDomain(ctx, projectID, domain.Domain, publicID)
	}
}

// checkDomain performs 6 diagnostic checks on a single domain and saves results.
func (s *InstallationService) checkDomain(ctx context.Context, projectID int, domain, publicID string) dto.DomainDiagnostics {
	now := time.Now()
	checkedAt := now.Format(time.RFC3339)

	checks := make([]dto.DiagnosticCheck, 0, 6)
	overallStatus := "ok"

	// 1. Fetch HTML page
	pageURL := "https://" + domain
	htmlBody, fetchErr := s.fetchPage(pageURL)

	// Check 1: Widget code found
	codeFound := false
	projectIDCorrect := false
	if fetchErr != nil {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "Widget code found on site",
			Status:  "fail",
			Message: "Could not fetch site",
			Detail:  util.StrPtr(fetchErr.Error()),
		})
		overallStatus = "error"
	} else {
		codeFound, projectIDCorrect = s.parseHTML(htmlBody, publicID)
		if codeFound {
			checks = append(checks, dto.DiagnosticCheck{
				Name:    "Widget code found on site",
				Status:  "pass",
				Message: "Widget script tag found",
			})
		} else {
			checks = append(checks, dto.DiagnosticCheck{
				Name:    "Widget code found on site",
				Status:  "fail",
				Message: "Widget script tag not found",
				Detail:  util.StrPtr("Add the widget code before </body> on your site"),
			})
			overallStatus = "error"
		}
	}

	// Check 2: Project ID correct
	if codeFound {
		if projectIDCorrect {
			checks = append(checks, dto.DiagnosticCheck{
				Name:    "Project ID is correct",
				Status:  "pass",
				Message: "data-project matches this project",
			})
		} else {
			checks = append(checks, dto.DiagnosticCheck{
				Name:    "Project ID is correct",
				Status:  "fail",
				Message: "data-project does not match this project",
				Detail:  util.StrPtr("Ensure data-project=\"" + publicID + "\""),
			})
			overallStatus = "error"
		}
	} else {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "Project ID is correct",
			Status:  "pending",
			Message: "Cannot check — widget code not found",
		})
	}

	// Check 3: Domain in allowed list
	domainAllowed, domainErr := s.repos.ProjectDomain.ExistsByProjectAndDomain(ctx, projectID, domain)
	if domainErr != nil {
		logger.Error("installation", "check domain allowed", "domain", domain, "error", domainErr)
	}
	if domainAllowed {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "Domain is in allowed list",
			Status:  "pass",
			Message: "Domain is registered",
		})
	} else {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "Domain is in allowed list",
			Status:  "fail",
			Message: "Domain not found in project domains",
		})
		overallStatus = "error"
	}

	// Check 4: CDN accessible
	cdnURL := s.cfg.WidgetCDNURL + "/loader.js"
	cdnOK := s.checkCDN(cdnURL)
	if cdnOK {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "CDN is accessible",
			Status:  "pass",
			Message: "loader.js is reachable",
		})
	} else {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "CDN is accessible",
			Status:  "warn",
			Message: "Could not reach CDN",
			Detail:  util.StrPtr(cdnURL),
		})
		if overallStatus == "ok" {
			overallStatus = "warning"
		}
	}

	// Check 5: Active products
	isActive := true
	activeCount, countErr := s.repos.Product.Count(ctx, repository.ProductListFilter{
		ProjectID: projectID,
		IsActive:  &isActive,
		Limit:     1,
	})
	if countErr != nil {
		logger.Error("installation", "count active products for diagnostics", "projectID", projectID, "error", countErr)
	}
	if activeCount > 0 {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "Product catalog available",
			Status:  "pass",
			Message: fmt.Sprintf("%d active products", activeCount),
		})
	} else {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "Product catalog available",
			Status:  "fail",
			Message: "No active products found",
			Detail:  util.StrPtr("Upload and activate products in the catalog"),
		})
		overallStatus = "error"
	}

	// Check 6: HTTPS
	if fetchErr == nil {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "HTTPS",
			Status:  "pass",
			Message: "Site loads over HTTPS",
		})
	} else if strings.Contains(fetchErr.Error(), "certificate") || strings.Contains(fetchErr.Error(), "tls") {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "HTTPS",
			Status:  "warn",
			Message: "SSL/TLS issue detected",
			Detail:  util.StrPtr(fetchErr.Error()),
		})
		if overallStatus == "ok" {
			overallStatus = "warning"
		}
	} else {
		checks = append(checks, dto.DiagnosticCheck{
			Name:    "HTTPS",
			Status:  "pass",
			Message: "HTTPS check passed",
		})
	}

	// Save to DB
	modelChecks := make(model.DiagnosticChecks, len(checks))
	for i, c := range checks {
		modelChecks[i] = model.DiagnosticCheckEntry{
			Name:    c.Name,
			Status:  c.Status,
			Message: c.Message,
			Detail:  c.Detail,
		}
	}
	if upsertErr := s.repos.DiagnosticResult.Upsert(ctx, &model.DiagnosticResult{
		ProjectID: projectID,
		Domain:    domain,
		Status:    overallStatus,
		Checks:    modelChecks,
		CheckedAt: now,
	}); upsertErr != nil {
		logger.Error("installation", "upsert diagnostic result", "domain", domain, "error", upsertErr)
	}

	return dto.DomainDiagnostics{
		Domain:    domain,
		CheckedAt: &checkedAt,
		Status:    overallStatus,
		Checks:    checks,
	}
}

func (s *InstallationService) fetchPage(url string) (string, error) {
	resp, err := s.client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024)) // 1MB limit
	if err != nil {
		return "", err
	}
	return string(body), nil
}

// parseHTML searches for <script> tag with loader.js and data-project attribute.
func (s *InstallationService) parseHTML(htmlBody, expectedProjectID string) (codeFound, projectIDCorrect bool) {
	tokenizer := html.NewTokenizer(strings.NewReader(htmlBody))
	for {
		tt := tokenizer.Next()
		if tt == html.ErrorToken {
			break
		}
		if tt != html.StartTagToken && tt != html.SelfClosingTagToken {
			continue
		}
		tn, _ := tokenizer.TagName()
		if string(tn) != "script" {
			continue
		}

		var src, dataProject string
		for {
			key, val, more := tokenizer.TagAttr()
			k := string(key)
			v := string(val)
			if k == "src" {
				src = v
			}
			if k == "data-project" {
				dataProject = v
			}
			if !more {
				break
			}
		}

		if strings.Contains(src, "loader.js") {
			codeFound = true
			projectIDCorrect = dataProject == expectedProjectID
			return
		}
	}
	return false, false
}

type cscartAddonFile struct {
	tarPath string
	srcPath string
	subst   bool
}

var cscartAddonFiles = []cscartAddonFile{
	{
		tarPath: "app/addons/makemelook/addon.xml",
		srcPath: "addons/cscart/addon.xml",
		subst:   true,
	},
	{
		tarPath: "app/addons/makemelook/init.php",
		srcPath: "addons/cscart/init.php",
		subst:   false,
	},
	{
		tarPath: "var/themes_repository/responsive/templates/addons/makemelook/hooks/index/head_scripts.post.tpl",
		srcPath: "addons/cscart/head_scripts.post.tpl",
		subst:   true,
	},
	{
		tarPath: "var/themes_repository/responsive/templates/addons/makemelook/hooks/products/product_multicolumns_list_control.post.tpl",
		srcPath: "addons/cscart/product_multicolumns_list_control.post.tpl",
		subst:   false,
	},
	{
		tarPath: "var/themes_repository/responsive/templates/addons/makemelook/hooks/products/buttons_block.post.tpl",
		srcPath: "addons/cscart/buttons_block.post.tpl",
		subst:   false,
	},
}

func (s *InstallationService) DownloadCSCartAddon(ctx context.Context, userID, projectID int) ([]byte, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	token := project.PublicID.String()
	cdnURL := s.cfg.WidgetCDNURL

	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)

	for _, f := range cscartAddonFiles {
		data, err := fs.ReadFile(assets.CSCartAddon, f.srcPath)
		if err != nil {
			return nil, fmt.Errorf("read asset %s: %w", f.srcPath, err)
		}

		if f.subst {
			content := string(data)
			content = strings.ReplaceAll(content, "{{.ProjectToken}}", token)
			content = strings.ReplaceAll(content, "{{.CDNBaseURL}}", cdnURL)
			data = []byte(content)
		}

		hdr := &tar.Header{
			Name:    f.tarPath,
			Mode:    0644,
			Size:    int64(len(data)),
			ModTime: time.Now(),
		}
		if err := tw.WriteHeader(hdr); err != nil {
			return nil, fmt.Errorf("write tar header: %w", err)
		}
		if _, err := tw.Write(data); err != nil {
			return nil, fmt.Errorf("write tar data: %w", err)
		}
	}

	if err := tw.Close(); err != nil {
		return nil, fmt.Errorf("close tar: %w", err)
	}
	if err := gw.Close(); err != nil {
		return nil, fmt.Errorf("close gzip: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *InstallationService) checkCDN(url string) bool {
	req, err := http.NewRequest("HEAD", url, nil)
	if err != nil {
		return false
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode < 400
}

