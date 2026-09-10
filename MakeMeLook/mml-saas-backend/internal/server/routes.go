package server

import (
	"net/http"

	"mml-saas-backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

func (s *Server) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RealIP)
	r.Use(chimw.RequestID)
	r.Use(middleware.RequestLogger)
	r.Use(chimw.Recoverer)

	r.Get("/health", s.handleHealth)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.CORS(s.cfg.CORSAllowedOrigins))
		// Reference (public)
		r.Get("/reference", s.reference.Get)

		// Auth routes (public)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", s.auth.Register)
			r.Post("/login", s.auth.Login)
			r.Post("/verify-email", s.auth.VerifyEmail)
			r.Post("/logout", s.auth.Logout)
			r.Post("/refresh", s.auth.Refresh)
			r.Post("/resend-verification", s.auth.ResendVerification)
			r.Post("/password-reset", s.auth.PasswordReset)
			r.Post("/password-reset/verify", s.auth.PasswordResetVerify)
			r.Post("/password-reset/complete", s.auth.PasswordResetComplete)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(s.cfg.JWTSecret))

			// Users
			r.Get("/users/me", s.user.GetMe)
			r.Patch("/users/me", s.user.UpdateProfile)
			r.Post("/users/me/password", s.user.ChangePassword)
			r.Delete("/users/me", s.user.DeleteAccount)

			// Dashboard
			r.Get("/dashboard/stats", s.project.GetDashboardStats)
			r.Get("/dashboard/recent-projects", s.project.GetRecentProjects)

			// Projects
			r.Post("/projects", s.project.CreateProject)
			r.Get("/projects", s.project.ListProjects)
			r.Get("/projects/{id}", s.project.GetProject)
			r.Put("/projects/{id}", s.project.UpdateProject)
			r.Delete("/projects/{id}", s.project.DeleteProject)
			r.Put("/projects/{id}/status", s.project.UpdateStatus)
			r.Get("/projects/{id}/stats", s.project.GetStats)
			r.Get("/projects/{id}/onboarding", s.project.GetOnboardingStatus)

			// Project Domains
			r.Get("/projects/{id}/domains", s.project.ListDomains)
			r.Post("/projects/{id}/domains", s.project.AddDomain)
			r.Delete("/projects/{id}/domains/{domainId}", s.project.DeleteDomain)

			// Project-level photo upload (before product creation)
			r.Post("/projects/{id}/photos", s.product.UploadProjectPhoto)

			// Products
			r.Get("/projects/{id}/products", s.product.ListProducts)
			r.Post("/projects/{id}/products", s.product.CreateProduct)
			r.Post("/projects/{id}/products/bulk", s.product.BulkAction)
			r.Get("/projects/{id}/products/{productId}", s.product.GetProduct)
			r.Put("/projects/{id}/products/{productId}", s.product.UpdateProduct)
			r.Delete("/projects/{id}/products/{productId}", s.product.DeleteProduct)

			// Product Photos
			r.Post("/projects/{id}/products/{productId}/photos", s.product.UploadPhoto)
			r.Put("/projects/{id}/products/{productId}/photos/reorder", s.product.ReorderPhotos)
			r.Delete("/projects/{id}/products/{productId}/photos/{photoId}", s.product.DeletePhoto)

			// Product Import
			r.Get("/projects/{id}/products/import/template", s.product.GetImportTemplate)
			r.Post("/projects/{id}/products/import/parse-headers", s.product.ParseImportHeaders)
			r.Post("/projects/{id}/products/import/validate", s.product.ValidateImportCSV)
			r.Post("/projects/{id}/products/import/execute", s.product.ExecuteImport)
			r.Get("/projects/{id}/products/import/{importId}/status", s.product.GetImportStatus)

			// Integrations (Ecommerce)
			r.Get("/projects/{id}/integrations", s.ecommerce.ListStores)
			r.Post("/projects/{id}/integrations", s.ecommerce.CreateStore)
			r.Get("/projects/{id}/integrations/{storeId}", s.ecommerce.GetStore)
			r.Put("/projects/{id}/integrations/{storeId}", s.ecommerce.UpdateStore)
			r.Delete("/projects/{id}/integrations/{storeId}", s.ecommerce.DeleteStore)
			r.Post("/projects/{id}/integrations/{storeId}/test", s.ecommerce.TestConnection)
			r.Post("/projects/{id}/integrations/{storeId}/sync", s.ecommerce.StartSync)
			r.Get("/projects/{id}/integrations/{storeId}/status", s.ecommerce.GetSyncStatus)
			r.Post("/projects/{id}/integrations/{storeId}/fetch-categories", s.ecommerce.FetchCategories)
			r.Get("/projects/{id}/integrations/{storeId}/categories", s.ecommerce.ListCategories)
			r.Get("/projects/{id}/integrations/{storeId}/mappings", s.ecommerce.ListMappings)
			r.Put("/projects/{id}/integrations/{storeId}/mappings", s.ecommerce.SaveMappings)

			// Widget Config
			r.Get("/projects/{id}/widget-config", s.widgetConfig.GetConfig)
			r.Put("/projects/{id}/widget-config", s.widgetConfig.UpdateConfig)
			r.Get("/projects/{id}/widget-config/presets", s.widgetConfig.GetPresets)
			r.Post("/projects/{id}/widget-config/apply-preset", s.widgetConfig.ApplyPreset)
			r.Post("/projects/{id}/widget-config/logo", s.widgetConfig.UploadLogo)
			r.Delete("/projects/{id}/widget-config/logo", s.widgetConfig.DeleteLogo)

			// Installation & Diagnostics
			r.Get("/projects/{id}/widget-code", s.installation.GetWidgetCode)
			r.Get("/projects/{id}/installation/readiness", s.installation.GetReadiness)
			r.Post("/projects/{id}/diagnostics/run", s.installation.RunDiagnostics)
			r.Get("/projects/{id}/diagnostics", s.installation.GetDiagnostics)
			r.Get("/projects/{id}/addons/cscart", s.installation.DownloadCSCartAddon)

			// Leads
			r.Get("/projects/{id}/leads", s.lead.ListLeads)
			r.Get("/projects/{id}/leads/{leadId}", s.lead.GetLead)
			r.Get("/projects/{id}/leads/{leadId}/tryon-history", s.lead.GetTryOnHistory)
			r.Post("/projects/{id}/leads/export", s.lead.ExportCSV)

			// Analytics
			r.Get("/projects/{id}/analytics/summary", s.analytics.GetSummary)
			r.Get("/projects/{id}/analytics/funnel", s.analytics.GetFunnel)
			r.Get("/projects/{id}/analytics/trends", s.analytics.GetTrends)
			r.Get("/projects/{id}/analytics/top-products", s.analytics.GetTopProducts)
			r.Get("/projects/{id}/analytics/audience", s.analytics.GetAudience)

			// Product Groups
			r.Get("/projects/{id}/product-groups", s.product.ListGroups)
			r.Post("/projects/{id}/product-groups", s.product.CreateGroup)
			r.Put("/projects/{id}/product-groups/{groupId}", s.product.UpdateGroup)
			r.Delete("/projects/{id}/product-groups/{groupId}", s.product.DeleteGroup)
			r.Post("/projects/{id}/product-groups/{groupId}/products", s.product.AddProductsToGroup)
			r.Delete("/projects/{id}/product-groups/{groupId}/products/{productId}", s.product.RemoveProductFromGroup)
		})
	})

	// Storefront API (public, read-only, rate-limited — for showcase store)
	r.Route("/api/storefront/v1/{projectPublicId}", func(r chi.Router) {
		r.Use(middleware.WidgetCORS())
		r.Use(middleware.WidgetRateLimit(s.storefrontIPLimiter))
		r.Get("/products", s.storefront.ListProducts)
		r.Get("/products/{productPublicId}", s.storefront.GetProduct)
		r.Get("/categories", s.storefront.ListCategories)
	})

	// OAuth redirects & callbacks (browser navigations, not XHR — no CORS needed)
	r.Route("/api/v1/widget/auth", func(r chi.Router) {
		r.Get("/google", s.widgetOAuth.GoogleRedirect)
		r.Get("/google/callback", s.widgetOAuth.GoogleCallback)
		r.Get("/yandex", s.widgetOAuth.YandexRedirect)
		r.Get("/yandex/callback", s.widgetOAuth.YandexCallback)
	})

	r.Route("/api/widget/v1", func(r chi.Router) {
		r.Use(middleware.WidgetCORS())
		r.Use(middleware.WidgetRateLimit(s.widgetIPLimiter))

		// Config: domain verification middleware guards access (Step 22)
		r.With(middleware.WidgetDomainVerification(s.domainVerifier, s.cfg.IsDevelopment())).
			Get("/config/{projectId}", s.widgetAPI.GetConfig)

		// Public share view (no auth)
		r.Get("/share/{tryOnPublicId}", s.widgetSession.ShareView)

		// Sessions (Lead API)
		r.Post("/sessions", s.widgetSession.CreateSession)
		r.Get("/sessions/{token}", s.widgetSession.GetSession)
		r.Put("/sessions/{token}", s.widgetSession.UpdateSession)
		r.Post("/sessions/{token}/photos", s.widgetSession.UploadPhoto)

		// Auth (widget user authentication)
		r.Post("/sessions/{token}/auth/send-code", s.widgetAuth.SendCode)
		r.Post("/sessions/{token}/auth/verify", s.widgetAuth.VerifyCode)

		// Try-on (additional rate limiting: 20/hour/IP + 50/session)
		r.With(middleware.WidgetTryOnRateLimit(s.tryOnIPLimiter, s.tryOnSessionLimiter)).
			Post("/sessions/{token}/tryon", s.widgetSession.TryOn)
		r.Get("/sessions/{token}/tryon/{tryOnId}/status", s.widgetSession.TryOnStatus)
		r.Get("/sessions/{token}/tryon-history", s.widgetSession.TryOnHistory)

		// Favorites
		r.Post("/sessions/{token}/favorites", s.widgetSession.AddFavorite)
		r.Get("/sessions/{token}/favorites", s.widgetSession.ListFavorites)
		r.Delete("/sessions/{token}/favorites/{id}", s.widgetSession.DeleteFavorite)

		// Cart
		r.Post("/sessions/{token}/cart", s.widgetSession.AddCartItem)
		r.Get("/sessions/{token}/cart", s.widgetSession.ListCartItems)
		r.Delete("/sessions/{token}/cart/{id}", s.widgetSession.DeleteCartItem)

		// Product sync (auto-import from platform DOM, e.g. Tilda)
		r.Post("/sessions/{token}/products/sync", s.widgetSession.SyncProducts)

		// Avatars
		r.Get("/avatars", s.widgetSession.ListAvatars)
		r.Get("/avatars/match", s.widgetSession.MatchAvatars)

		// Size Recommendation
		r.Post("/recommend-size", s.sizeRecommendation.RecommendSize)

		// Events
		r.Post("/events", s.widgetSession.TrackEvents)
	})

	return r
}
