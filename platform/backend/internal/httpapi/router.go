package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"mml-platform-backend/internal/admin"
	"mml-platform-backend/internal/auth"
	"mml-platform-backend/internal/blog"
	"mml-platform-backend/internal/catalog"
	"mml-platform-backend/internal/chat"
	"mml-platform-backend/internal/collections"
	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/content"
	"mml-platform-backend/internal/cpa"
	"mml-platform-backend/internal/email"
	"mml-platform-backend/internal/enrich"
	"mml-platform-backend/internal/ingest"
	"mml-platform-backend/internal/partner"
	"mml-platform-backend/internal/passport"
	"mml-platform-backend/internal/personalize"
	"mml-platform-backend/internal/reco"
	"mml-platform-backend/internal/storage"
	"mml-platform-backend/internal/tryon"
	"mml-platform-backend/internal/waitlist"
)

func NewRouter(cfg *config.Config, pool *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RealIP, chimw.RequestID, chimw.Recoverer, chimw.Logger)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	repo := catalog.NewRepo(pool)
	recoClient := reco.New(cfg.RecoURL)
	catalogH := catalog.NewHandler(repo)
	searchH := catalog.NewSearchHandler(repo, recoClient, reco.VectorLiteral)

	// Доставка кодов входа: строгий Resend в проде; в dev — код в лог + Resend
	// best-effort (не роняет тесты). Без ключа — чистый dev-лог.
	var emailer email.Sender = email.Log{Logger: slog.Default()}
	if cfg.ResendAPIKey != "" {
		resend := email.NewResend(cfg.ResendAPIKey, cfg.ResendFrom, slog.Default())
		if cfg.Env == "dev" {
			emailer = email.Dev{Resend: resend, Logger: slog.Default()}
		} else {
			emailer = resend
		}
	}
	authSvc := auth.NewService(pool, cfg.JWTSecret, emailer, cfg.AppFrontURL, slog.Default())
	oauthCfg := auth.NewOAuthConfig(cfg.AppBaseURL, cfg.AppFrontURL,
		cfg.GoogleClientID, cfg.GoogleClientSecret,
		cfg.YandexClientID, cfg.YandexClientSecret)
	authH := auth.NewHandler(authSvc, cfg.Env == "prod", oauthCfg)

	// publicID пользователя → внутренний id (для паспорта).
	resolveUser := func(ctx context.Context, publicID string) (int64, error) {
		var id int64
		err := pool.QueryRow(ctx, `SELECT id FROM users WHERE public_id = $1`, publicID).Scan(&id)
		return id, err
	}
	// Объектное хранилище (MinIO): загрузки партнёра и медиатека блога.
	// Недоступно → nil → ручки загрузки честно отвечают 503.
	var storageClient *storage.Client
	if cfg.StorageEndpoint != "" {
		sc, err := storage.New(context.Background(), cfg.StorageEndpoint,
			cfg.StorageAccessKey, cfg.StorageSecretKey, cfg.StorageBucket,
			cfg.StoragePublicURL, cfg.StorageUseSSL)
		if err != nil {
			slog.Default().Error("storage init — загрузки отключены", "err", err)
		} else {
			storageClient = sc
		}
	}

	// Аватар — в то же хранилище, что и загрузки партнёра. Присваиваем ТОЛЬКО
	// при живом клиенте: nil-указатель в интерфейсе перестаёт быть nil, проверка
	// «хранилище не настроено» прошла бы мимо и вместо честного 501 была бы
	// паника на первой же загрузке.
	if storageClient != nil {
		authH.WithUploader(storageClient)
	}

	collH := collections.NewHandler(collections.NewStore(pool), resolveUser, func(r *http.Request) string {
		if c := auth.UserFrom(r.Context()); c != nil {
			return c.UserPublicID
		}
		return ""
	})
	passportStore := passport.NewStore(pool).WithMailer(authSvc)
	passportH := passport.NewHandler(passportStore, resolveUser, cfg.AnthropicAPIKey, cfg.AnthropicModel)

	// Примерка: mock-виджет для локального демо; реальный HTTPWidget включается
	// координируемым релизом виджета (серверный ключ). Переключатель — env.
	var widgetClient tryon.WidgetClient = tryon.NewMockWidget()
	if cfg.WidgetBaseURL != "" && cfg.WidgetAPIKey != "" {
		widgetClient = tryon.NewHTTPWidget(cfg.WidgetBaseURL, cfg.WidgetProjectID, cfg.WidgetAPIKey)
	}
	tryonSvc := tryon.NewService(pool, widgetClient)
	tryonH := tryon.NewHandler(tryonSvc, resolveUser)

	// Чат тянет паспорт вошедшего (гость → 0, "").
	chatOrch := chat.NewOrchestrator(cfg.AnthropicAPIKey, cfg.AnthropicBaseURL, cfg.AnthropicProxyKey, cfg.AnthropicModel,
		repo, recoClient, reco.VectorLiteral, chat.NewStore(pool), slog.Default())
	chatH := chat.NewHandler(chatOrch, func(r *http.Request) (int64, string, *catalog.Personalization) {
		c := auth.UserFrom(r.Context())
		if c == nil {
			return 0, "", nil
		}
		uid, err := resolveUser(r.Context(), c.UserPublicID)
		if err != nil {
			return 0, "", nil
		}
		prefs, err := passportStore.Current(r.Context(), uid)
		if err != nil {
			return uid, "", nil
		}
		pz := personalize.Build(prefs)
		// Любимые бренды человека почти всегда не наши (Burberry, Zara) —
		// расширяем их аналогами из каталога, иначе выбор в онбординге ни на
		// что не влияет: буст ищет точное совпадение имени.
		personalize.WithAnalogs(r.Context(), pz, repo.AnalogsFor)
		return uid, passport.Summarize(prefs), pz
	})

	r.Route("/api/v1", func(api chi.Router) {
		// Публичное
		api.Get("/products", catalogH.List)
		api.Get("/taste-brands", catalogH.TasteBrands) // справочник вкуса (не каталог)
		api.Get("/products/{publicID}", catalogH.Get)
		api.Get("/products/{publicID}/related", catalogH.Related)
		api.Get("/brands", catalogH.Brands)
		api.Get("/search", searchH.Search)

		// Лист ожидания с главной. POST лимитируем: ручка публичная и пишет в БД.
		waitlistH := waitlist.NewHandler(waitlist.NewStore(pool, cfg.WaitlistBase))
		api.Get("/waitlist", waitlistH.Count)
		api.With(limitMiddleware(newRateLimiter(10, time.Minute))).Post("/waitlist", waitlistH.Join)

		// Rate-лимиты на вход: отправка кода — строго (защита от спама письмами
		// и перебора), verify — умеренно. Per-IP, фиксированное окно.
		codeLimiter := limitMiddleware(newRateLimiter(5, time.Minute))
		verifyLimiter := limitMiddleware(newRateLimiter(15, time.Minute))

		// Auth
		api.With(codeLimiter).Post("/auth/request-code", authH.RequestCode)
		api.With(verifyLimiter).Post("/auth/verify", authH.Verify)
		api.Post("/auth/refresh", authH.Refresh)
		api.Post("/auth/logout", authH.Logout)
		// OAuth-вход (Google / Яндекс ID). Не настроен → 501.
		api.Get("/auth/oauth/{provider}/start", authH.OAuthStart)
		api.Get("/auth/oauth/{provider}/callback", authH.OAuthCallback)

		// Чат — гость или пользователь (Optional прикрепляет user, если вошёл)
		api.With(authSvc.Optional).Post("/chat", chatH.Send)

		// Паспорт и согласия — только для вошедших
		api.Group(func(pr chi.Router) {
			pr.Use(authSvc.Required)
			pr.Get("/me", authH.Me)
			pr.Post("/me/avatar", authH.UploadAvatar)
			pr.Delete("/me/avatar", authH.DeleteAvatar)
			pr.Get("/passport", passportH.Get)
			pr.Put("/passport", passportH.Save)
			pr.Post("/passport/refine", passportH.Refine)       // фидбек-петля
			pr.Get("/passport/style-code", passportH.StyleCode) // стиль-код (LLM по онбордингу)
			pr.Get("/consents", passportH.Consents)
			pr.Post("/consents", passportH.LogConsent)

			// 152-ФЗ one-tap: обнулить колориметрию + удалить фото примерок в
			// виджете + записать отзыв. Оба шага под одним действием.
			pr.Delete("/biometric", func(w http.ResponseWriter, r *http.Request) {
				c := auth.UserFrom(r.Context())
				uid, err := resolveUser(r.Context(), c.UserPublicID)
				if err != nil {
					http.Error(w, `{"error":"нужен вход"}`, http.StatusUnauthorized)
					return
				}
				_ = tryonSvc.PurgeUserPhotos(r.Context(), uid)
				passportH.DeleteBiometric(w, r)
			})

			// Примерка
			pr.Post("/tryon", tryonH.Start)
			pr.Get("/tryon/{publicID}", tryonH.Status)

			// Избранное и коллекции — на сервере (раньше избранное жило в
			// стейте фронта и терялось при перезагрузке).
			pr.Get("/favorites", collH.Favorites)
			pr.Post("/favorites/toggle", collH.ToggleFavorite)
			pr.Get("/collections", collH.List)
			pr.Post("/collections", collH.Create)
			pr.Delete("/collections/{id}", collH.Delete)
			pr.Get("/collections/{id}/items", collH.Items)
			pr.Post("/collections/{id}/items", collH.AddItem)
			pr.Delete("/collections/{id}/items/{productID}", collH.RemoveItem)
		})

		// Кабинет партнёра (Ф6). Отдельная сущность, общий email-код.
		partnerStore := partner.NewStore(pool, authSvc)
		// Хранилище общее (лого/сетка партнёра + медиатека блога).
		var uploader partner.Uploader
		if storageClient != nil {
			uploader = storageClient
		}
		partnerH := partner.NewHandler(partnerStore, cfg.Env == "prod", uploader)
		api.Route("/partner", func(pr chi.Router) {
			pr.With(codeLimiter).Post("/auth/request-code", partnerH.RequestCode)
			pr.With(verifyLimiter).Post("/auth/verify", partnerH.Verify)
			pr.Post("/auth/refresh", partnerH.Refresh)
			pr.Post("/auth/logout", partnerH.Logout)

			pr.Group(func(sr chi.Router) {
				sr.Use(authSvc.Required)
				sr.Get("/brand", partnerH.GetBrand)
				sr.Put("/brand", partnerH.SaveBrand)
				sr.Get("/settings", partnerH.GetSettings)
				sr.Put("/settings", partnerH.SaveSettings)
				sr.Get("/products", partnerH.Products)
				sr.Post("/products/hide", partnerH.HideProducts)
				sr.Post("/upload/{kind}", partnerH.Upload)
				sr.Post("/preview-product", partnerH.PreviewProduct)
				sr.Get("/catalog-sources", partnerH.CatalogSources)
				sr.Post("/catalog-sources", partnerH.AddCatalogSource)
			})
		})

		// Внутренняя админка (Ф7). Гейт по X-Admin-Token; ролей нет.
		adminStore := admin.NewStore(pool)
		delBio := func(ctx context.Context, userPublicID, actorName string) error {
			uid, err := resolveUser(ctx, userPublicID)
			if err != nil {
				return err
			}
			_ = tryonSvc.PurgeUserPhotos(ctx, uid)
			return passportStore.DeleteBiometric(ctx, uid, "admin:"+actorName)
		}
		ingestStore := ingest.NewStore(pool)
		syncSrc := func(sourceID int64) {
			// Асинхронно, свежий контекст: HTTP-запрос админа не ждёт синк.
			go func() {
				if _, err := ingestStore.Sync(context.Background(), sourceID); err != nil {
					slog.Default().Error("admin sync", "source", sourceID, "err", err)
				}
			}()
		}
		// A4 «Пересобрать атрибуты»: пересборка attributes выбранных товаров ИИ.
		// nil, если нет ключа LLM — тогда хендлер вернёт 501.
		var enrichRun admin.EnrichRunner
		if cfg.AnthropicAPIKey != "" {
			enr := enrich.New(cfg.AnthropicAPIKey, cfg.AnthropicModel)
			enrichRun = func(publicIDs []string) {
				go func() {
					done, failed := enr.RunForPublicIDs(context.Background(), pool, publicIDs)
					slog.Default().Info("admin enrich", "done", done, "failed", failed)
				}()
			}
		}
		adminH := admin.NewHandler(adminStore, delBio, syncSrc, enrichRun)

		// Блог. Медиатека — в MinIO; uploaded_by останется пустым, пока в
		// админку ходят по токену, а не пользователем.
		var blogUp blog.Uploader
		if storageClient != nil {
			blogUp = storageClient
		}
		blogH := blog.NewHandler(blog.NewStore(pool), blogUp, resolveUser, func(r *http.Request) string {
			if c := auth.UserFrom(r.Context()); c != nil {
				return c.UserPublicID
			}
			return ""
		})
		// Контент главной. Публично — чтение; правка под админ-гардом ниже.
		contentH := content.NewHandler(content.NewStore(pool))
		api.Get("/content", contentH.Get)

		// Публичное чтение блога — без авторизации.
		api.Route("/blog", func(br chi.Router) {
			br.Get("/posts", blogH.PublicList)
			br.Get("/posts/{slug}", blogH.PublicPost)
		})

		api.Route("/admin", func(ar chi.Router) {
			ar.Use(admin.Gate(cfg.AdminToken))
			ar.Get("/content", contentH.AdminGet)
			ar.Put("/content", contentH.Save)
			ar.Post("/content/reset", contentH.Reset)
			ar.Route("/blog", func(bl chi.Router) {
				bl.Get("/posts", blogH.Posts)
				bl.Post("/posts", blogH.CreatePost)
				bl.Get("/posts/{id}", blogH.Post)
				bl.Patch("/posts/{id}", blogH.UpdatePost)
				bl.Delete("/posts/{id}", blogH.DeletePost)
				bl.Patch("/posts/{id}/publish", blogH.PublishPost)
				bl.Post("/posts/{id}/duplicate", blogH.DuplicatePost)
				bl.Get("/authors", blogH.Authors)
				bl.Post("/authors", blogH.CreateAuthor)
				bl.Post("/media/upload", blogH.UploadMedia)
				bl.Get("/media", blogH.MediaList)
				bl.Delete("/media/{id}", blogH.DeleteMedia)
			})
			ar.Post("/sources/{id}/sync", adminH.SyncSource)                 // A3 запустить синк (источник)
			ar.Post("/partners/{publicID}/sync", adminH.SyncPartner)         // A3 запустить синк (партнёр)
			ar.Post("/partners/{publicID}/pause", adminH.PausePartner)       // A3 пауза партнёра
			ar.Get("/queue", adminH.Queue)                                   // A0
			ar.Get("/users/{publicID}/dialog", adminH.Dialog)                // A0
			ar.Get("/users/{publicID}/passport", adminH.UserPassport)        // A0 панель паспорта
			ar.Post("/users/{publicID}/mark", adminH.MarkLead)               // A0
			ar.Post("/labels", adminH.AddLabel)                              // A1
			ar.Get("/label-queue", adminH.LabelQueue)                        // A1 лента реальных пар
			ar.Get("/labels/stats", adminH.LabelStats)                       // A1
			ar.Get("/labels/export", adminH.ExportLabels)                    // A1
			ar.Post("/partners", adminH.CreatePartner)                       // A3 завести партнёра
			ar.Get("/partners", adminH.Partners)                             // A3
			ar.Get("/partners/{publicID}/rejects", adminH.Rejects)           // A3
			ar.Get("/products", adminH.Products)                             // A4
			ar.Post("/products/hide", adminH.HideProducts)                   // A4 модерация
			ar.Post("/products/enrich", adminH.EnrichProducts)               // A4 пересобрать атрибуты
			ar.Get("/tryons", adminH.Tryons)                                 // A5
			ar.Get("/consents", adminH.Consents)                             // A6
			ar.Get("/users/{publicID}/export", adminH.ExportUser)            // A2 152-ФЗ выгрузка
			ar.Delete("/users/{publicID}/biometric", adminH.DeleteBiometric) // A6
			ar.Get("/funnel", adminH.Funnel)                                 // A7
			ar.Get("/flags", adminH.Flags)                                   // A8
			ar.Put("/flags/{key}", adminH.SetFlag)                           // A8
			ar.Get("/audit", adminH.Audit)                                   // A8
		})
	})

	// Переход в магазин партнёра — короткий путь вне /api, попадает в ссылки.
	cpaH := cpa.NewHandler(pool, cfg.ClickSigningSecret)
	// Фидбек-петля: подтверждённая покупка усиливает паспорт покупателя.
	cpaH.OnConversion(func(ctx context.Context, clickID string) {
		var uid int64
		err := pool.QueryRow(ctx, `
			SELECT cs.user_id FROM clicks c
			JOIN chat_sessions cs ON cs.id = c.session_id
			WHERE c.click_id = $1 AND cs.user_id IS NOT NULL`, clickID).Scan(&uid)
		if err != nil {
			return // клик без вошедшего пользователя — учить некого
		}
		_, _ = passportStore.RefineFromBehavior(ctx, uid, 3)
	})
	r.Get("/r/{productPublicID}", cpaH.Redirect)
	// S2S-postback от партнёра/сети (подпись обязательна).
	r.Get("/cpa/postback", cpaH.Postback)
	r.Post("/cpa/postback", cpaH.Postback)

	return r
}
