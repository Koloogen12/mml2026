// Package partner — кабинет партнёра: вход email-кодом, профиль бренда,
// герой «вход через один товар» (парсинг URL → карточка → превью примерки).
package partner

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mml-platform-backend/internal/auth"
	mailer "mml-platform-backend/internal/email"
	"mml-platform-backend/internal/ingest"
)

const refreshTTL = 30 * 24 * time.Hour

var ErrBadRefresh = errors.New("сессия недействительна")

type Store struct {
	pool   *pgxpool.Pool
	auth   *auth.Service // переиспользуем код-механику + подпись токенов
	ingest *ingest.Store // синхронизация фида партнёра
}

func NewStore(pool *pgxpool.Pool, authSvc *auth.Service) *Store {
	return &Store{pool: pool, auth: authSvc, ingest: ingest.NewStore(pool)}
}

type VerifyResult struct {
	AccessToken  string
	RefreshToken string
	PublicID     string
	BrandName    string
	IsNew        bool
}

// RequestCode переиспользует общую выдачу кода, но письмо уходит партнёрское.
func (s *Store) RequestCode(ctx context.Context, email string) error {
	return s.auth.RequestCode(ctx, email, true)
}

// Verify гасит код, апсертит партнёра, выдаёт токены (партнёрская сессия).
func (s *Store) Verify(ctx context.Context, email, code, userAgent string) (*VerifyResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if err := s.auth.ConsumeCode(ctx, email, code); err != nil {
		return nil, err
	}

	var id int64
	var publicID string
	var brandName *string
	var createdAt, updatedAt time.Time
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO partners (email) VALUES ($1)
		ON CONFLICT (email) DO UPDATE SET updated_at = now()
		RETURNING id, public_id, brand_name, created_at, updated_at`,
		email).Scan(&id, &publicID, &brandName, &createdAt, &updatedAt); err != nil {
		return nil, err
	}

	raw := randomToken()
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO partner_sessions (partner_id, refresh_hash, user_agent, expires_at)
		VALUES ($1, $2, $3, $4)`,
		id, hashToken(raw), userAgent, time.Now().Add(refreshTTL)); err != nil {
		return nil, err
	}
	access, err := s.auth.SignAccess(id, publicID)
	if err != nil {
		return nil, err
	}
	res := &VerifyResult{
		AccessToken:  access,
		RefreshToken: raw,
		PublicID:     publicID,
		BrandName:    deref(brandName),
		IsNew:        createdAt.Equal(updatedAt),
	}
	if res.IsNew {
		s.auth.SendAsync(email, mailer.PartnerWelcome(s.auth.FrontURL()+"/partner/"))
	}
	return res, nil
}

func (s *Store) Refresh(ctx context.Context, refreshToken string) (string, error) {
	var id int64
	var publicID string
	err := s.pool.QueryRow(ctx, `
		SELECT p.id, p.public_id FROM partner_sessions s
		JOIN partners p ON p.id = s.partner_id
		WHERE s.refresh_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
		hashToken(refreshToken)).Scan(&id, &publicID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrBadRefresh
	}
	if err != nil {
		return "", err
	}
	return s.auth.SignAccess(id, publicID)
}

// Logout отзывает refresh-сессию партнёра (по токену из cookie).
func (s *Store) Logout(ctx context.Context, refreshToken string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE partner_sessions SET revoked_at = now() WHERE refresh_hash = $1`,
		hashToken(refreshToken))
	return err
}

func (s *Store) IDByPublicID(ctx context.Context, publicID string) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx, `SELECT id FROM partners WHERE public_id = $1`, publicID).Scan(&id)
	return id, err
}

// Brand — профиль бренда.
type Brand struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	LogoURL     string `json:"logo_url"`
	Description string `json:"description"`
}

func (s *Store) Brand(ctx context.Context, partnerID int64) (*Brand, error) {
	var b Brand
	var name, slug, logo, desc *string
	err := s.pool.QueryRow(ctx,
		`SELECT brand_name, slug, logo_url, description FROM partners WHERE id = $1`,
		partnerID).Scan(&name, &slug, &logo, &desc)
	if err != nil {
		return nil, err
	}
	b.Name, b.Slug, b.LogoURL, b.Description = deref(name), deref(slug), deref(logo), deref(desc)
	return &b, nil
}

// SaveLogoURL проставляет логотип партнёра (после загрузки в хранилище).
func (s *Store) SaveLogoURL(ctx context.Context, partnerID int64, url string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE partners SET logo_url = $2, updated_at = now() WHERE id = $1`, partnerID, url)
	return err
}

// SaveSizeChart сохраняет размерную сетку как {"url":...,"kind":...} в jsonb.
func (s *Store) SaveSizeChart(ctx context.Context, partnerID int64, url, kind string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE partners SET size_chart = jsonb_build_object('url',$2::text,'kind',$3::text),
		 updated_at = now() WHERE id = $1`, partnerID, url, kind)
	return err
}

func (s *Store) SaveBrand(ctx context.Context, partnerID int64, b Brand) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE partners SET brand_name = NULLIF($2,''), description = NULLIF($3,''),
		  logo_url = NULLIF($4,''), slug = NULLIF($5,''), updated_at = now()
		WHERE id = $1`, partnerID, b.Name, b.Description, b.LogoURL, b.Slug)
	return err
}

// Settings — настройки кабинета (юр-лицо, контакт, префы уведомлений).
type Settings struct {
	Company            string `json:"company"`
	ContactPerson      string `json:"contact_person"`
	Email              string `json:"email"`
	NotifyFeedErrors   bool   `json:"notify_feed_errors"`
	NotifyWeeklyDigest bool   `json:"notify_weekly_digest"`
}

func (s *Store) Settings(ctx context.Context, partnerID int64) (*Settings, error) {
	var st Settings
	var company, contact *string
	err := s.pool.QueryRow(ctx, `
		SELECT company, contact_person, COALESCE(email,''),
		       notify_feed_errors, notify_weekly_digest
		FROM partners WHERE id = $1`, partnerID).
		Scan(&company, &contact, &st.Email, &st.NotifyFeedErrors, &st.NotifyWeeklyDigest)
	if err != nil {
		return nil, err
	}
	st.Company, st.ContactPerson = deref(company), deref(contact)
	return &st, nil
}

func (s *Store) SaveSettings(ctx context.Context, partnerID int64, st Settings) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE partners SET company = NULLIF($2,''), contact_person = NULLIF($3,''),
		  notify_feed_errors = $4, notify_weekly_digest = $5, updated_at = now()
		WHERE id = $1`,
		partnerID, st.Company, st.ContactPerson, st.NotifyFeedErrors, st.NotifyWeeklyDigest)
	return err
}

// CatalogSource — подключённый источник каталога.
type CatalogSource struct {
	Kind       string  `json:"kind"`
	URL        string  `json:"url,omitempty"`
	Status     string  `json:"status"`
	LastSyncAt *string `json:"last_sync_at,omitempty"`
	LastError  string  `json:"last_error,omitempty"`
}

func (s *Store) CatalogSources(ctx context.Context, partnerID int64) ([]CatalogSource, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT kind, COALESCE(url,''), status,
		       to_char(last_sync_at,'YYYY-MM-DD"T"HH24:MI:SSZ'), COALESCE(last_error,'')
		FROM partner_catalog_sources WHERE partner_id = $1 ORDER BY created_at DESC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CatalogSource
	for rows.Next() {
		var c CatalogSource
		var last *string
		if err := rows.Scan(&c.Kind, &c.URL, &c.Status, &last, &c.LastError); err != nil {
			return nil, err
		}
		c.LastSyncAt = last
		out = append(out, c)
	}
	return out, rows.Err()
}

// AddCatalogSource заводит источник и возвращает его id (для последующего синка).
// schedule — каденция автосинка (daily|hourly|manual); по умолчанию daily.
func (s *Store) AddCatalogSource(ctx context.Context, partnerID int64, kind, url, schedule string) (int64, error) {
	switch schedule {
	case "daily", "hourly", "manual": // ок
	default:
		schedule = "daily"
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO partner_catalog_sources (partner_id, kind, url, schedule)
		 VALUES ($1, $2, NULLIF($3,''), $4) RETURNING id`,
		partnerID, kind, url, schedule).Scan(&id)
	return id, err
}

// SyncSource синхронизирует фид источника (проверив, что он принадлежит партнёру)
// и возвращает реальные счётчики импорта для визарда.
func (s *Store) SyncSource(ctx context.Context, partnerID, sourceID int64) (*ingest.SyncResult, error) {
	var owner int64
	if err := s.pool.QueryRow(ctx,
		`SELECT partner_id FROM partner_catalog_sources WHERE id=$1`, sourceID).Scan(&owner); err != nil {
		return nil, err
	}
	if owner != partnerID {
		return nil, errors.New("источник не принадлежит партнёру")
	}
	return s.ingest.Sync(ctx, sourceID)
}

// Products — реальные товары партнёра (через source_id → его источники каталога).
// Включает скрытые (is_active=false) — с флагом hidden, чтобы партнёр видел и мог
// вернуть их в выдачу. Исключены только soft-удалённые (выбывшие из фида).
func (s *Store) Products(ctx context.Context, partnerID int64) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT p.public_id, p.name, COALESCE(p.garment_zone,''), p.tryon_eligible,
		       COALESCE(p.tryon_ineligible_reason,''), NOT p.is_active,
		       (SELECT min(o.price) FROM offers o WHERE o.product_id=p.id),
		       (SELECT url FROM product_images WHERE product_id=p.id ORDER BY position LIMIT 1)
		FROM products p
		JOIN partner_catalog_sources pcs ON pcs.id = p.source_id
		WHERE pcs.partner_id = $1 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC LIMIT 500`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var pid, name, zone, reason string
		var elig, hidden bool
		var price *float64
		var img *string
		if err := rows.Scan(&pid, &name, &zone, &elig, &reason, &hidden, &price, &img); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": pid, "name": name, "garment_zone": zone, "tryon_eligible": elig,
			"tryon_ineligible_reason": reason, "hidden": hidden, "price": price, "image_url": img,
		})
	}
	return out, rows.Err()
}

// SetProductsHidden скрывает/возвращает товары партнёра в выдаче (is_active).
// Гейт по владению: обновляются только товары, чей source принадлежит партнёру.
// Возвращает число затронутых.
func (s *Store) SetProductsHidden(ctx context.Context, partnerID int64, publicIDs []string, hidden bool) (int64, error) {
	if len(publicIDs) == 0 {
		return 0, nil
	}
	ct, err := s.pool.Exec(ctx, `
		UPDATE products p SET is_active = $3, updated_at = now()
		FROM partner_catalog_sources pcs
		WHERE p.source_id = pcs.id AND pcs.partner_id = $1
		  AND p.deleted_at IS NULL AND p.public_id::text = ANY($2)`,
		partnerID, publicIDs, !hidden)
	if err != nil {
		return 0, err
	}
	return ct.RowsAffected(), nil
}

func randomToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func hashToken(t string) string {
	sum := sha256.Sum256([]byte(t))
	return hex.EncodeToString(sum[:])
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
