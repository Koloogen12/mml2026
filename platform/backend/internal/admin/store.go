package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct{ pool *pgxpool.Pool }

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// ─────────────────────────── A0 · Стол стилиста ───────────────────────────

// QueueItem — карточка человека в концьерж-очереди.
type QueueItem struct {
	PublicID     string     `json:"id"`
	Contact      string     `json:"contact"`
	DisplayName  string     `json:"display_name,omitempty"`
	Source       string     `json:"source,omitempty"`
	Status       string     `json:"status"`
	LastActionAt *time.Time `json:"last_action_at,omitempty"`
	Dialogs      int        `json:"dialogs"`
	Tryons       int        `json:"tryons"`
}

// Queue — очередь для A0/A2. status="" → все.
func (s *Store) Queue(ctx context.Context, status string, limit int) ([]QueueItem, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := s.pool.Query(ctx, `
		SELECT u.public_id, u.email, COALESCE(u.display_name,''), COALESCE(u.lead_source,''),
		       u.lead_status, u.last_action_at,
		       (SELECT count(*) FROM chat_sessions cs WHERE cs.user_id = u.id),
		       (SELECT count(*) FROM tryons t WHERE t.user_id = u.id)
		FROM users u
		WHERE ($1 = '' OR u.lead_status = $1)
		ORDER BY u.last_action_at DESC NULLS LAST, u.created_at DESC
		LIMIT $2`, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []QueueItem{}
	for rows.Next() {
		var it QueueItem
		if err := rows.Scan(&it.PublicID, &it.Contact, &it.DisplayName, &it.Source,
			&it.Status, &it.LastActionAt, &it.Dialogs, &it.Tryons); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

// QueueCounts — счётчики по статусам (для фильтра A0).
func (s *Store) QueueCounts(ctx context.Context) (map[string]int, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT lead_status, count(*) FROM users GROUP BY lead_status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var k string
		var n int
		if err := rows.Scan(&k, &n); err != nil {
			return nil, err
		}
		out[k] = n
	}
	return out, rows.Err()
}

// DialogMessage — строка переписки для центральной колонки A0.
type DialogMessage struct {
	ID         int64     `json:"id"`
	Role       string    `json:"role"`
	Content    string    `json:"content"`
	ProductIDs []string  `json:"product_ids,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// Dialog — последняя переписка пользователя (по последней сессии).
func (s *Store) Dialog(ctx context.Context, userPublicID string) ([]DialogMessage, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT m.id, m.role, m.content, m.product_ids, m.created_at
		FROM chat_messages m
		JOIN chat_sessions cs ON cs.id = m.session_id
		JOIN users u ON u.id = cs.user_id
		WHERE u.public_id = $1
		ORDER BY m.created_at ASC
		LIMIT 500`, userPublicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []DialogMessage{}
	for rows.Next() {
		var m DialogMessage
		var pids []string
		if err := rows.Scan(&m.ID, &m.Role, &m.Content, &pids, &m.CreatedAt); err != nil {
			return nil, err
		}
		m.ProductIDs = pids
		out = append(out, m)
	}
	return out, rows.Err()
}

// UserPassport — паспорт стиля человека для панели «Стол стилиста» (A0).
// Реальные данные вместо демо: оператор видит, кого он одевает. nil, если паспорта нет.
func (s *Store) UserPassport(ctx context.Context, userPublicID string) (map[string]any, error) {
	var persona, love, avoid, selfDesc, aspir []string
	var forWhom, mood string
	var budget, sizes []byte
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(up.for_whom,''), COALESCE(up.style_persona_blend,'{}'),
		       COALESCE(up.brands_love,'{}'), COALESCE(up.brands_avoid,'{}'),
		       COALESCE(up.style_self_described,'{}'), COALESCE(up.style_aspirational,'{}'),
		       COALESCE(up.desired_mood_default,''), up.budget_by_category, up.size_by_category
		FROM user_preferences up JOIN users u ON u.id = up.user_id
		WHERE u.public_id = $1 AND up.valid_to IS NULL`, userPublicID).
		Scan(&forWhom, &persona, &love, &avoid, &selfDesc, &aspir, &mood, &budget, &sizes)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"for_whom": forWhom, "persona": persona, "brands_love": love, "brands_avoid": avoid,
		"self_described": selfDesc, "aspirational": aspir, "mood": mood,
		"budget_by_category": json.RawMessage(nonEmptyJSON(budget)),
		"size_by_category":   json.RawMessage(nonEmptyJSON(sizes)),
	}, nil
}

func nonEmptyJSON(b []byte) []byte {
	if len(b) == 0 {
		return []byte("{}")
	}
	return b
}

// MarkLead — сменить статус лида; при «купил» фиксируем сумму (метрика теста).
func (s *Store) MarkLead(ctx context.Context, userPublicID, status string, kopecks *int64) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE users SET lead_status = $2,
		       purchased_kopecks = COALESCE($3, purchased_kopecks),
		       last_action_at = now(), updated_at = now()
		WHERE public_id = $1`, userPublicID, status, kopecks)
	return err
}

// ─────────────────────────── A1 · Разметка (gold-set) ──────────────────────

type Label struct {
	SessionPublicID string `json:"session_id,omitempty"`
	MessageID       *int64 `json:"message_id,omitempty"`
	UserPublicID    string `json:"user_id,omitempty"`
	Rater           string `json:"rater"`
	Relevance       *int16 `json:"relevance,omitempty"`
	OrderOK         *int16 `json:"order_ok,omitempty"`
	Occasion        *int16 `json:"occasion,omitempty"`
	PaletteSize     *int16 `json:"palette_size,omitempty"`
	NoteQuality     *int16 `json:"note_quality,omitempty"`
	Why             string `json:"why,omitempty"`
}

func (s *Store) AddLabel(ctx context.Context, l Label) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO answer_labels
		  (session_id, message_id, user_id, rater, relevance, order_ok, occasion, palette_size, note_quality, why)
		VALUES (
		  (SELECT id FROM chat_sessions WHERE public_id::text = NULLIF($1,'')),
		  $2,
		  (SELECT id FROM users WHERE public_id::text = NULLIF($3,'')),
		  $4, $5, $6, $7, $8, $9, NULLIF($10,''))`,
		l.SessionPublicID, l.MessageID, l.UserPublicID, l.Rater,
		l.Relevance, l.OrderOK, l.Occasion, l.PaletteSize, l.NoteQuality, l.Why)
	return err
}

// LabelPair — реальная пара «запрос → ответ ИИ» для разметки (A1). Раньше пара
// была демо-константой, и оценки летели в gold-set без привязки к сессии.
type LabelPair struct {
	MessageID  int64       `json:"message_id"`
	SessionID  string      `json:"session_id"`
	UserID     string      `json:"user_id,omitempty"`
	UserEmail  string      `json:"user_email,omitempty"`
	Query      string      `json:"query"`
	Answer     string      `json:"answer"`
	ProductIDs []string    `json:"product_ids"`
	Products   []LabelProd `json:"products"`
	CreatedAt  string      `json:"created_at"`
}

// LabelProd — карточка показанного товара (оператор должен видеть, что оценивает).
type LabelProd struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Brand    string   `json:"brand"`
	Price    *float64 `json:"price"`
	ImageURL string   `json:"image_url"`
	Zone     string   `json:"zone"`
}

// LabelQueue — ответы ассистента с товарами + предшествующий запрос человека.
// onlyUnlabeled=true → только те, что ещё не размечены (лента оператора).
func (s *Store) LabelQueue(ctx context.Context, onlyUnlabeled bool, limit int) ([]LabelPair, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	rows, err := s.pool.Query(ctx, `
		SELECT m.id, cs.public_id::text, COALESCE(u.public_id::text,''), COALESCE(u.email,''),
		       COALESCE((SELECT prev.content FROM chat_messages prev
		                 WHERE prev.session_id = m.session_id AND prev.role = 'user' AND prev.id < m.id
		                 ORDER BY prev.id DESC LIMIT 1), ''),
		       m.content, m.product_ids::text[],
		       to_char(m.created_at,'YYYY-MM-DD"T"HH24:MI:SSZ')
		FROM chat_messages m
		JOIN chat_sessions cs ON cs.id = m.session_id
		LEFT JOIN users u ON u.id = cs.user_id
		WHERE m.role = 'assistant' AND array_length(m.product_ids,1) > 0
		  AND ($1 = false OR NOT EXISTS (SELECT 1 FROM answer_labels al WHERE al.message_id = m.id))
		ORDER BY m.created_at DESC
		LIMIT $2`, onlyUnlabeled, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []LabelPair{}
	for rows.Next() {
		var p LabelPair
		if err := rows.Scan(&p.MessageID, &p.SessionID, &p.UserID, &p.UserEmail,
			&p.Query, &p.Answer, &p.ProductIDs, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// Догружаем карточки показанных товаров — оператор оценивает то, что видит.
	for i := range out {
		out[i].Products = s.labelProducts(ctx, out[i].ProductIDs)
	}
	return out, nil
}

func (s *Store) labelProducts(ctx context.Context, ids []string) []LabelProd {
	if len(ids) == 0 {
		return []LabelProd{}
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.public_id::text, p.name, b.name, COALESCE(p.garment_zone,''),
		       (SELECT min(o.price) FROM offers o WHERE o.product_id = p.id),
		       COALESCE((SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1),'')
		FROM products p JOIN brands b ON b.id = p.brand_id
		WHERE p.public_id::text = ANY($1)`, ids)
	if err != nil {
		return []LabelProd{}
	}
	defer rows.Close()
	out := []LabelProd{}
	for rows.Next() {
		var lp LabelProd
		if rows.Scan(&lp.ID, &lp.Name, &lp.Brand, &lp.Zone, &lp.Price, &lp.ImageURL) == nil {
			out = append(out, lp)
		}
	}
	return out
}

// LabelStats — «размечено N из целевых 300».
func (s *Store) LabelStats(ctx context.Context, target int) (map[string]any, error) {
	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM answer_labels`).Scan(&total); err != nil {
		return nil, err
	}
	return map[string]any{"labeled": total, "target": target}, nil
}

// ExportLabels — единственный экспорт (JSONL-строки). Возвращаем срез объектов.
func (s *Store) ExportLabels(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT al.id, cs.public_id, al.message_id, u.public_id, al.rater,
		       al.relevance, al.order_ok, al.occasion, al.palette_size, al.note_quality,
		       COALESCE(al.why,''), al.created_at
		FROM answer_labels al
		LEFT JOIN chat_sessions cs ON cs.id = al.session_id
		LEFT JOIN users u ON u.id = al.user_id
		ORDER BY al.created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id int64
		var sid, uid *string
		var mid *int64
		var rater, why string
		var rel, ord, occ, pal, note *int16
		var created time.Time
		if err := rows.Scan(&id, &sid, &mid, &uid, &rater, &rel, &ord, &occ, &pal, &note, &why, &created); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": id, "session_id": sid, "message_id": mid, "user_id": uid,
			"rater": rater, "relevance": rel, "order_ok": ord, "occasion": occ,
			"palette_size": pal, "note_quality": note, "why": why,
			"created_at": created.Format(time.RFC3339),
		})
	}
	return out, rows.Err()
}

// ─────────────────────────── A3 · Партнёры и каталог ───────────────────────

type PartnerRow struct {
	PublicID   string     `json:"id"`
	BrandName  string     `json:"brand_name"`
	Email      string     `json:"email"`
	Sources    int        `json:"sources"`
	LastSyncAt *time.Time `json:"last_sync_at,omitempty"`
	LastStatus string     `json:"last_sync_status,omitempty"`
}

// CreatePartner заводит партнёра вручную (ручной онбординг A3). Возвращает
// public_id. Если партнёр с такой почтой уже есть — обновляет имя бренда.
func (s *Store) CreatePartner(ctx context.Context, email, brandName string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var publicID string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO partners (email, brand_name) VALUES ($1, NULLIF($2,''))
		ON CONFLICT (email) DO UPDATE SET
		  brand_name = COALESCE(NULLIF($2,''), partners.brand_name), updated_at = now()
		RETURNING public_id`, email, strings.TrimSpace(brandName)).Scan(&publicID)
	return publicID, err
}

func (s *Store) Partners(ctx context.Context) ([]PartnerRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT p.public_id, COALESCE(p.brand_name,''), p.email,
		       (SELECT count(*) FROM partner_catalog_sources pcs WHERE pcs.partner_id = p.id),
		       r.started_at, COALESCE(r.status,'')
		FROM partners p
		LEFT JOIN LATERAL (
		  SELECT csr.started_at, csr.status FROM catalog_sync_runs csr
		  JOIN partner_catalog_sources pcs ON pcs.id = csr.source_id
		  WHERE pcs.partner_id = p.id ORDER BY csr.started_at DESC LIMIT 1
		) r ON true
		ORDER BY p.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PartnerRow{}
	for rows.Next() {
		var p PartnerRow
		if err := rows.Scan(&p.PublicID, &p.BrandName, &p.Email, &p.Sources, &p.LastSyncAt, &p.LastStatus); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ExportUser собирает все данные пользователя (152-ФЗ, право на выгрузку):
// профиль, паспорт, согласия, примерки, клики. Возвращает готовый к отдаче объект.
func (s *Store) ExportUser(ctx context.Context, userPublicID string) (map[string]any, error) {
	out := map[string]any{"exported_at": time.Now().Format(time.RFC3339)}

	var uid int64
	var email, name string
	var created time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, COALESCE(display_name,''), created_at FROM users WHERE public_id=$1`,
		userPublicID).Scan(&uid, &email, &name, &created)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	out["profile"] = map[string]any{
		"id": userPublicID, "email": email, "display_name": name,
		"registered_at": created.Format(time.RFC3339),
	}

	// Паспорт (актуальная версия).
	if p, e := s.UserPassport(ctx, userPublicID); e == nil {
		out["style_passport"] = p
	}
	// Согласия + примерки + клики.
	out["consents"], _ = s.Consents(ctx, userPublicID, 500)
	var tryons, clicks int
	_ = s.pool.QueryRow(ctx, `SELECT count(*) FROM tryons WHERE user_id=$1`, uid).Scan(&tryons)
	_ = s.pool.QueryRow(ctx, `
		SELECT count(*) FROM clicks c JOIN chat_sessions cs ON cs.id=c.session_id WHERE cs.user_id=$1`,
		uid).Scan(&clicks)
	out["activity"] = map[string]any{"tryons": tryons, "store_clicks": clicks}
	return out, nil
}

// SetPartnerPaused ставит/снимает партнёра с паузы: скрывает/возвращает его
// товары и помечает партнёра (синк пропускает paused-партнёров).
func (s *Store) SetPartnerPaused(ctx context.Context, partnerPublicID string, paused bool) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var pid int64
		if err := tx.QueryRow(ctx,
			`UPDATE partners SET paused=$2, updated_at=now() WHERE public_id=$1 RETURNING id`,
			partnerPublicID, paused).Scan(&pid); err != nil {
			return err
		}
		// На паузе гасим только живые товары; при снятии — возвращаем лишь те,
		// что не были soft-удалены дифф-синком (deleted_at NULL), чтобы не
		// воскрешать выбывшие из фида позиции.
		_, err := tx.Exec(ctx, `
			UPDATE products SET is_active = $2, updated_at = now()
			WHERE source_id IN (SELECT id FROM partner_catalog_sources WHERE partner_id=$1)
			  AND deleted_at IS NULL`,
			pid, !paused)
		return err
	})
}

// SetProductsHidden скрывает/возвращает товары (модерация каталога, A4).
func (s *Store) SetProductsHidden(ctx context.Context, publicIDs []string, hidden bool) (int64, error) {
	ct, err := s.pool.Exec(ctx, `
		UPDATE products SET is_active = $2, updated_at = now()
		WHERE public_id::text = ANY($1)`, publicIDs, !hidden)
	if err != nil {
		return 0, err
	}
	return ct.RowsAffected(), nil
}

// SourceIDsForPartner — id фид-источников партнёра (для запуска синка из админки).
func (s *Store) SourceIDsForPartner(ctx context.Context, partnerPublicID string) ([]int64, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT pcs.id FROM partner_catalog_sources pcs
		JOIN partners p ON p.id = pcs.partner_id
		WHERE p.public_id = $1 AND pcs.kind = 'feed'`, partnerPublicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// Rejects — блок «Что сломалось»: отклонённые товары по всем синкам партнёра.
func (s *Store) Rejects(ctx context.Context, partnerPublicID string, limit int) ([]map[string]any, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := s.pool.Query(ctx, `
		SELECT cr.external_id, COALESCE(cr.product_title,''), cr.reason, COALESCE(cr.detail,''), cr.created_at
		FROM catalog_rejects cr
		JOIN catalog_sync_runs csr ON csr.id = cr.sync_run_id
		JOIN partner_catalog_sources pcs ON pcs.id = csr.source_id
		JOIN partners p ON p.id = pcs.partner_id
		WHERE p.public_id = $1
		ORDER BY cr.created_at DESC LIMIT $2`, partnerPublicID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var ext, title, reason, detail string
		var created time.Time
		if err := rows.Scan(&ext, &title, &reason, &detail, &created); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"external_id": ext, "title": title, "reason": reason,
			"detail": detail, "created_at": created.Format(time.RFC3339),
		})
	}
	return out, rows.Err()
}

// ─────────────────────────── A4 · Товары ───────────────────────────────────

func (s *Store) Products(ctx context.Context, limit int) ([]map[string]any, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.public_id, b.name, p.name, p.garment_zone,
		       p.tryon_eligible, COALESCE(p.tryon_ineligible_reason,''),
		       (p.attributes <> '{}'::jsonb) AS enriched,
		       (SELECT min(o.price) FROM offers o WHERE o.product_id = p.id) AS price
		FROM products p JOIN brands b ON b.id = p.brand_id
		WHERE p.deleted_at IS NULL
		ORDER BY p.created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var pid, brand, name string
		var zone, reason *string
		var eligible, enriched bool
		var price *float64
		if err := rows.Scan(&pid, &brand, &name, &zone, &eligible, &reason, &enriched, &price); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": pid, "brand": brand, "name": name, "garment_zone": zone,
			"tryon_eligible": eligible, "tryon_ineligible_reason": *reason,
			"enriched": enriched, "price": price,
		})
	}
	return out, rows.Err()
}

// ─────────────────────────── A5 · Примерки и себестоимость ──────────────────

// TryonQueue — очередь генераций.
func (s *Store) TryonQueue(ctx context.Context, limit int) ([]map[string]any, error) {
	if limit <= 0 || limit > 300 {
		limit = 100
	}
	rows, err := s.pool.Query(ctx, `
		SELECT t.public_id, t.status, COALESCE(t.model,''), t.cost_kopecks,
		       COALESCE(t.error_reason,''), array_length(t.product_ids,1), t.created_at, u.email
		FROM tryons t JOIN users u ON u.id = t.user_id
		ORDER BY t.created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var pid, status, model, errReason, email string
		var cost, items *int
		var created time.Time
		if err := rows.Scan(&pid, &status, &model, &cost, &errReason, &items, &created, &email); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": pid, "status": status, "model": model, "cost_kopecks": cost,
			"error_reason": errReason, "items": items, "user": email,
			"created_at": created.Format(time.RFC3339),
		})
	}
	return out, rows.Err()
}

// CostSummary — блок себестоимости. Считаем ТОЛЬКО по генерациям с проставленной
// моделью/ценой; без данных — честные нули, а не выдуманные проценты.
func (s *Store) CostSummary(ctx context.Context, since time.Time) (map[string]any, error) {
	var total, pro, sumKop int
	err := s.pool.QueryRow(ctx, `
		SELECT
		  count(*) FILTER (WHERE model IS NOT NULL),
		  count(*) FILTER (WHERE model = 'pro'),
		  COALESCE(sum(cost_kopecks) FILTER (WHERE cost_kopecks IS NOT NULL), 0)
		FROM tryons WHERE created_at >= $1`, since).Scan(&total, &pro, &sumKop)
	if err != nil {
		return nil, err
	}
	res := map[string]any{
		"generations":        total,
		"pro_count":          pro,
		"cost_kopecks_total": sumKop,
		"has_data":           total > 0,
	}
	if total > 0 {
		res["pro_share"] = float64(pro) / float64(total)
		res["avg_cost_kopecks"] = float64(sumKop) / float64(total)
	}
	return res, nil
}

// ─────────────────────────── A6 · Согласия и биометрия ─────────────────────

func (s *Store) Consents(ctx context.Context, userPublicID string, limit int) ([]map[string]any, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := s.pool.Query(ctx, `
		SELECT u.public_id, u.email, cl.kind, COALESCE(cl.version,''), cl.granted,
		       COALESCE(cl.ip,''), cl.created_at
		FROM consent_logs cl JOIN users u ON u.id = cl.user_id
		WHERE ($1 = '' OR u.public_id::text = $1)
		ORDER BY cl.created_at DESC LIMIT $2`, userPublicID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var uid, email, kind, version, ip string
		var granted bool
		var created time.Time
		if err := rows.Scan(&uid, &email, &kind, &version, &granted, &ip, &created); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"user_id": uid, "email": email, "kind": kind, "version": version,
			"granted": granted, "ip": ip, "created_at": created.Format(time.RFC3339),
		})
	}
	return out, rows.Err()
}

// ─────────────────────────── A7 · Воронка (честный скелет) ──────────────────

// Funnel — этапы концьерж-воронки реальными числами. Пусто — значит пусто.
func (s *Store) Funnel(ctx context.Context) (map[string]any, error) {
	var waitlist, dialog, selection, tryon, clicked, purchased int
	err := s.pool.QueryRow(ctx, `
		SELECT
		  (SELECT count(*) FROM users),
		  (SELECT count(DISTINCT user_id) FROM chat_sessions WHERE user_id IS NOT NULL),
		  (SELECT count(DISTINCT cs.user_id) FROM chat_messages m
		     JOIN chat_sessions cs ON cs.id = m.session_id
		     WHERE m.role='assistant' AND m.product_ids <> '{}'),
		  (SELECT count(DISTINCT user_id) FROM tryons),
		  (SELECT count(*) FROM users WHERE lead_status IN ('clicked','purchased')),
		  (SELECT count(*) FROM users WHERE lead_status = 'purchased')
	`).Scan(&waitlist, &dialog, &selection, &tryon, &clicked, &purchased)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"stages": []map[string]any{
			{"key": "waitlist", "label": "Вейтлист", "count": waitlist},
			{"key": "dialog", "label": "Диалог", "count": dialog},
			{"key": "selection", "label": "Подборка", "count": selection},
			{"key": "tryon", "label": "Примерка", "count": tryon},
			{"key": "clicked", "label": "Переход в магазин", "count": clicked},
			{"key": "purchased", "label": "Покупка", "count": purchased},
		},
		"has_data": waitlist > 0,
	}, nil
}

// ─────────────────────────── A8 · Флаги и лимиты ────────────────────────────

func (s *Store) Flags(ctx context.Context) (map[string]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT key, value FROM feature_flags ORDER BY key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}

func (s *Store) SetFlag(ctx context.Context, key, value, by string) error {
	ct, err := s.pool.Exec(ctx, `
		UPDATE feature_flags SET value = $2, updated_by = $3, updated_at = now()
		WHERE key = $1`, key, value, by)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// Audit — журнал действий админки + запись новых.
func (s *Store) LogAudit(ctx context.Context, actor, action, target string, detail any) error {
	raw, _ := json.Marshal(detail)
	if len(raw) == 0 {
		raw = []byte("{}")
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO admin_audit_log (actor, action, target, detail) VALUES ($1,$2,$3,$4)`,
		actor, action, target, raw)
	return err
}

func (s *Store) Audit(ctx context.Context, limit int) ([]map[string]any, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.pool.Query(ctx, `
		SELECT actor, action, COALESCE(target,''), detail, created_at
		FROM admin_audit_log ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var actor, action, target string
		var detail json.RawMessage
		var created time.Time
		if err := rows.Scan(&actor, &action, &target, &detail, &created); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"actor": actor, "action": action, "target": target,
			"detail": detail, "created_at": created.Format(time.RFC3339),
		})
	}
	return out, rows.Err()
}
