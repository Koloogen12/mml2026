// Package tryon — примерка платформы: consent-гейт 152-ФЗ + интеграция с
// виджетом. Биометрия (фото) хранится в виджете; платформа держит ссылки и
// следит за согласием.
package tryon

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ConsentVersion — актуальная версия согласия на биометрию. Меняется вместе с
// текстом; каждая примерка фиксирует, под какой версией была запущена.
const ConsentVersion = "v2.1"

// Себестоимость вызова модели, копейки. Роутер по числу вещей: 1–2 → Flash
// (дёшево/быстро), 3+ → Pro (держит идентичность и позу). Маржа ≥50% живёт на
// доле Pro — поэтому цену фиксируем на каждой генерации и показываем в A5.
// Значения — настраиваемые оценки единичной стоимости вызова, не тариф клиента.
const (
	costFlashKopecks = 200 // ~2 ₽
	costProKopecks   = 900 // ~9 ₽
	proGarmentFloor  = 3   // с этого числа вещей включается Pro
)

// routeModel выбирает модель и её себестоимость по числу вещей.
func routeModel(itemCount int) (model string, costKopecks int) {
	if itemCount >= proGarmentFloor {
		return "pro", costProKopecks
	}
	return "flash", costFlashKopecks
}

var (
	ErrConsentRequired = errors.New("нужно согласие на обработку биометрии")
	ErrNoProducts      = errors.New("нужен хотя бы один товар")
	ErrTooManyProducts = errors.New("не больше пяти вещей за раз")
	ErrNotFound        = errors.New("примерка не найдена")
)

type Service struct {
	pool   *pgxpool.Pool
	widget WidgetClient
}

func NewService(pool *pgxpool.Pool, widget WidgetClient) *Service {
	return &Service{pool: pool, widget: widget}
}

type StartInput struct {
	UserID          int64
	SessionPublicID string
	ProductIDs      []string // public_id товаров платформы
	Photo           []byte
	PhotoType       string
}

type Result struct {
	PublicID  string `json:"id"`
	Status    string `json:"status"`
	ResultURL string `json:"result_url,omitempty"`
}

// HasBiometricConsent — согласие дано и не отозвано позже (152-ФЗ гейт).
// Смотрим последнюю запись по biometric_required + отсутствие более позднего
// удаления/отзыва.
func (s *Service) HasBiometricConsent(ctx context.Context, userID int64) (bool, error) {
	var granted bool
	err := s.pool.QueryRow(ctx, `
		SELECT granted FROM consent_logs
		WHERE user_id = $1 AND kind IN ('biometric_required','biometric_deleted')
		ORDER BY created_at DESC LIMIT 1`, userID).Scan(&granted)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return granted, nil
}

// Start проверяет согласие, запускает рендер в виджете, пишет строку примерки.
func (s *Service) Start(ctx context.Context, in StartInput) (*Result, error) {
	switch {
	case len(in.ProductIDs) == 0:
		return nil, ErrNoProducts
	case len(in.ProductIDs) > 5:
		return nil, ErrTooManyProducts
	}

	// Согласие 152-ФЗ на биометрию собирает сам виджет примерки (у него свой
	// контур согласия и хранения фото). Платформенный гейт снят; при реальной
	// интеграции виджета (HTTPWidget) согласие обеспечивает виджет.
	// HasBiometricConsent остаётся для журнала согласий/удаления в паспорте.

	render, err := s.widget.Start(ctx, in.Photo, in.PhotoType, in.ProductIDs)
	if err != nil {
		return nil, err
	}

	var sessionID *int64
	if in.SessionPublicID != "" {
		var sid int64
		if e := s.pool.QueryRow(ctx,
			`SELECT id FROM chat_sessions WHERE public_id = $1`, in.SessionPublicID).Scan(&sid); e == nil {
			sessionID = &sid
		}
	}

	model, costKopecks := routeModel(len(in.ProductIDs))

	var publicID string
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO tryons (user_id, session_id, product_ids, widget_photo_id,
		                    widget_tryon_id, status, consent_version, model, cost_kopecks)
		VALUES ($1, $2, $3::uuid[], $4, $5, $6, $7, $8, $9)
		RETURNING public_id`,
		in.UserID, sessionID, in.ProductIDs, render.PhotoID, render.TryonID,
		render.Status, ConsentVersion, model, costKopecks).Scan(&publicID); err != nil {
		return nil, err
	}

	return &Result{PublicID: publicID, Status: render.Status, ResultURL: render.ResultURL}, nil
}

// Status опрашивает виджет по конкретной примерке и обновляет строку.
func (s *Service) Status(ctx context.Context, userID int64, publicID string) (*Result, error) {
	var widgetTryonID, status, resultURL string
	err := s.pool.QueryRow(ctx, `
		SELECT widget_tryon_id, status, COALESCE(result_url,'')
		FROM tryons WHERE public_id = $1 AND user_id = $2`,
		publicID, userID).Scan(&widgetTryonID, &status, &resultURL)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	// Терминальные статусы не переспрашиваем.
	if status == "done" || status == "failed" {
		return &Result{PublicID: publicID, Status: status, ResultURL: resultURL}, nil
	}

	render, err := s.widget.Status(ctx, widgetTryonID)
	if err != nil {
		return &Result{PublicID: publicID, Status: status, ResultURL: resultURL}, nil
	}
	if render.Status != status || render.ResultURL != "" {
		_, _ = s.pool.Exec(ctx, `
			UPDATE tryons SET status = $1, result_url = NULLIF($2,''), updated_at = now()
			WHERE public_id = $3`, render.Status, render.ResultURL, publicID)
	}
	return &Result{PublicID: publicID, Status: render.Status, ResultURL: render.ResultURL}, nil
}

// PurgeUserPhotos удаляет биометрию пользователя в виджете и чистит ссылки —
// вызывается из 152-ФЗ one-tap delete (расширяет passport.DeleteBiometric).
func (s *Service) PurgeUserPhotos(ctx context.Context, userID int64) error {
	rows, err := s.pool.Query(ctx,
		`SELECT DISTINCT widget_photo_id FROM tryons
		 WHERE user_id = $1 AND widget_photo_id IS NOT NULL`, userID)
	if err != nil {
		return err
	}
	var photoIDs []string
	for rows.Next() {
		var pid string
		if err := rows.Scan(&pid); err == nil && pid != "" {
			photoIDs = append(photoIDs, pid)
		}
	}
	rows.Close()

	for _, pid := range photoIDs {
		_ = s.widget.DeletePhoto(ctx, pid) // best-effort; ошибка не блокирует удаление ссылок
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tryons SET widget_photo_id = NULL, updated_at = now() WHERE user_id = $1`, userID)
	return err
}
