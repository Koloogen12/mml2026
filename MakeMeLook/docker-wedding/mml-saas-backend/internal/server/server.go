package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/handler"
	"mml-saas-backend/internal/middleware"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/mailer"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/robfig/cron/v3"
)

type Server struct {
	httpServer          *http.Server
	cfg                 *config.Config
	repos               *repository.Repositories
	minio               *minio.Client
	cron                *cron.Cron
	auth                *handler.AuthHandler
	user                *handler.UserHandler
	project             *handler.ProjectHandler
	product             *handler.ProductHandler
	widgetConfig        *handler.WidgetConfigHandler
	reference           *handler.ReferenceHandler
	installation        *handler.InstallationHandler
	widgetAPI           *handler.WidgetAPIHandler
	widgetSession       *handler.WidgetSessionHandler
	ecommerce           *handler.EcommerceHandler
	lead                *handler.LeadHandler
	analytics           *handler.AnalyticsHandler
	sizeRecommendation  *handler.SizeRecommendationHandler
	widgetAuth          *handler.WidgetAuthHandler
	widgetOAuth         *handler.WidgetOAuthHandler
	ecommerceSvc        *service.EcommerceService
	analyticsSvc        *service.AnalyticsService
	installSvc          *service.InstallationService
	tryOnSvc            *service.TryOnService
	widgetIPLimiter      *middleware.RateLimiter
	tryOnIPLimiter       *middleware.RateLimiter
	tryOnSessionLimiter  *middleware.RateLimiter
	storefrontIPLimiter  *middleware.RateLimiter
	domainVerifier       middleware.DomainVerifier
	storefront           *handler.StorefrontHandler
}

func New(cfg *config.Config, repos *repository.Repositories, minioClient *minio.Client, mlr *mailer.Mailer) *Server {
	storageSvc := service.NewStorage(cfg, minioClient)
	authSvc := service.NewAuth(repos, cfg, mlr)
	userSvc := service.NewUser(repos, cfg, storageSvc)
	projectSvc := service.NewProject(repos, cfg, storageSvc)
	projectDomainSvc := service.NewProjectDomain(repos)
	productSvc := service.NewProduct(repos, storageSvc)
	groupSvc := service.NewProductGroup(repos)
	widgetConfigSvc := service.NewWidgetConfig(repos, storageSvc)
	installSvc := service.NewInstallation(repos, cfg)
	widgetAPISvc := service.NewWidgetAPI(repos, cfg, storageSvc)

	ecommerceSvc := service.NewEcommerce(repos, storageSvc)

	// Analytics
	analyticsSvc := service.NewAnalytics(repos, cfg)

	// Admin lead service (SaaS cabinet)
	leadAdminSvc := service.NewLeadAdmin(repos, storageSvc, cfg)

	// Widget session services
	leadSvc := service.NewLead(repos, storageSvc, cfg.MinioBucket, widgetAPISvc, cfg)
	tryOnSvc := service.NewTryOn(repos, storageSvc, cfg)
	avatarSvc := service.NewAvatar(repos, storageSvc, cfg)
	favSvc := service.NewFavorite(repos, storageSvc, cfg)
	cartSvc := service.NewCart(repos, storageSvc, cfg)
	eventSvc := service.NewWidgetEvent(repos)
	sizeRecSvc := service.NewSizeRecommendation(repos)

	// OAuth
	oauthSvc := service.NewOAuth(repos, cfg)

	// Domain verifier: resolves allowed hostnames for a project by its public UUID.
	// Used by WidgetDomainVerification middleware (Step 22).
	domainVerifier := middleware.DomainVerifier(func(ctx context.Context, projectPublicIDStr string) ([]string, error) {
		publicID, err := uuid.Parse(projectPublicIDStr)
		if err != nil {
			return nil, fmt.Errorf("invalid project ID: %w", err)
		}
		project, err := repos.Project.GetByPublicID(ctx, publicID)
		if err != nil {
			return nil, err
		}
		if project == nil {
			return nil, nil // project not found — downstream handler returns 404
		}
		domains, err := repos.ProjectDomain.ListByProjectID(ctx, project.ID)
		if err != nil {
			return nil, err
		}
		result := make([]string, len(domains))
		for i, d := range domains {
			result[i] = d.Domain
		}
		return result, nil
	})

	storefrontSvc := service.NewStorefront(repos, storageSvc)

	s := &Server{
		cfg:                  cfg,
		repos:                repos,
		minio:                minioClient,
		widgetIPLimiter:      middleware.NewRateLimiter(cfg.RateLimitWidgetPerMin, 1*time.Minute),
		tryOnIPLimiter:       middleware.NewRateLimiter(cfg.RateLimitTryOnPerHour, 1*time.Hour),
		tryOnSessionLimiter:  middleware.NewRateLimiter(cfg.RateLimitTryOnPerDay, 24*time.Hour),
		storefrontIPLimiter:  middleware.NewRateLimiter(100, 1*time.Minute),
		domainVerifier:       domainVerifier,
		storefront:           handler.NewStorefront(storefrontSvc),
		auth:                handler.NewAuth(authSvc, cfg),
		user:                handler.NewUser(authSvc, userSvc),
		project:             handler.NewProject(projectSvc, projectDomainSvc, widgetConfigSvc),
		product:             handler.NewProduct(productSvc, groupSvc),
		ecommerce:           handler.NewEcommerce(ecommerceSvc),
		widgetConfig:        handler.NewWidgetConfig(widgetConfigSvc),
		reference:           handler.NewReference(),
		installation:        handler.NewInstallation(installSvc),
		widgetAPI:           handler.NewWidgetAPI(widgetAPISvc),
		widgetSession: handler.NewWidgetSession(
			leadSvc, tryOnSvc, avatarSvc, favSvc, cartSvc, eventSvc, productSvc, storageSvc, cfg.MinioBucket,
		),
		lead:               handler.NewLead(leadAdminSvc),
		sizeRecommendation: handler.NewSizeRecommendation(sizeRecSvc, leadSvc),
		widgetAuth:         handler.NewWidgetAuth(leadSvc, mlr),
		widgetOAuth:        handler.NewWidgetOAuth(oauthSvc),
		analytics:    handler.NewAnalytics(analyticsSvc),
		ecommerceSvc: ecommerceSvc,
		analyticsSvc: analyticsSvc,
		installSvc:   installSvc,
		tryOnSvc:     tryOnSvc,
	}

	s.httpServer = &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      s.routes(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	s.setupCron()

	return s
}

func (s *Server) Start() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	s.tryOnSvc.CleanupStuckJobs(ctx)
	logger.Info("server", "HTTP server starting", "port", s.cfg.ServerPort)
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	logger.Info("server", "HTTP server shutting down")
	if s.cron != nil {
		s.cron.Stop()
	}
	return logger.LogError(s.httpServer.Shutdown(ctx))
}

func (s *Server) setupCron() {
	c := cron.New()

	// Run diagnostics for active projects every hour
	_, err := c.AddFunc("0 * * * *", func() {
		logger.Info("cron", "Running auto-diagnostics for active projects")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		ids, err := s.repos.DiagnosticResult.GetActiveProjectIDs(ctx)
		if err != nil {
			logger.Error("cron", "Failed to get active project IDs", "error", err)
			return
		}

		for _, id := range ids {
			s.installSvc.RunDiagnosticsForProject(ctx, id)
		}

		logger.Info("cron", "Auto-diagnostics completed", "projects", len(ids))
	})
	if err != nil {
		logger.Error("cron", "Failed to register diagnostics cron", "error", err)
		return
	}

	// Aggregate widget events every 15 minutes
	_, err = c.AddFunc("*/15 * * * *", func() {
		logger.Info("cron", "Running event aggregation")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		s.analyticsSvc.RunAggregation(ctx)
	})
	if err != nil {
		logger.Error("cron", "Failed to register aggregation cron", "error", err)
		return
	}

	// Sync ecommerce stores every 15 minutes
	_, err = c.AddFunc("*/15 * * * *", func() {
		logger.Info("cron", "Running ecommerce sync")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		s.ecommerceSvc.RunScheduledSync(ctx)
	})
	if err != nil {
		logger.Error("cron", "Failed to register ecommerce sync cron", "error", err)
		return
	}

	c.Start()
	s.cron = c
	logger.Info("cron", "Cron scheduler started")
}
