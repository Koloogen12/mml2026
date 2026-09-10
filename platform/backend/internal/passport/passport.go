// Package passport — паспорт стиля (SLOW-слой) + согласия 152-ФЗ.
// Онбординг собирается анонимно на фронте и сохраняется одним PUT после входа;
// этот же эндпоинт правит паспорт во вкладке P1.
package passport

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	mailer "mml-platform-backend/internal/email"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
	mail Mailer // может быть nil
}

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// WithMailer подключает отправку квитанции об удалении биометрии. Опционально:
// без неё удаление работает как раньше, просто молча.
func (s *Store) WithMailer(m Mailer) *Store { s.mail = m; return s }

// Mailer — фоновая отправка письма (реализует auth.Service).
type Mailer interface {
	SendAsync(to string, m mailer.Mail)
}

// Preferences — SLOW-слой паспорта (то, что собирает онбординг O3–O8).
type Preferences struct {
	ForWhom             string          `json:"for_whom,omitempty"`
	StylePersonaBlend   []string        `json:"style_persona_blend,omitempty"`
	BrandsLove          []string        `json:"brands_love,omitempty"`
	BrandsAvoid         []string        `json:"brands_avoid,omitempty"`
	BudgetByCategory    json.RawMessage `json:"budget_by_category,omitempty"`
	SizeByCategory      json.RawMessage `json:"size_by_category,omitempty"`
	LifestyleAllocation json.RawMessage `json:"lifestyle_allocation,omitempty"`
	StyleSelfDescribed  []string        `json:"style_self_described,omitempty"`
	StyleAspirational   []string        `json:"style_aspirational,omitempty"`
	DesiredMoodDefault  string          `json:"desired_mood_default,omitempty"`
	BodyLove            []string        `json:"body_love,omitempty"`
	BodyDownplay        []string        `json:"body_downplay,omitempty"`
	HardConstraints     json.RawMessage `json:"hard_constraints,omitempty"`
	// Имя для приветствия (собирается на 1-м шаге онбординга). Пишется в users,
	// не в user_preferences — не часть вкусового профиля.
	DisplayName string `json:"display_name,omitempty"`
}

func jsonOrEmpty(r json.RawMessage) []byte {
	if len(r) == 0 {
		return []byte("{}")
	}
	return r
}

// Save закрывает текущую версию (SCD-2) и вставляет новую — история вкуса важна.
/*
 * SavePatch — сохранение версии паспорта с СЛИЯНИЕМ.
 *
 * Паспорт версионируется (SCD-2): старая строка закрывается, новая вставляется.
 * Раньше новая строка собиралась только из присланного, поэтому частичная
 * правка (размер, стоп-лист, подписка на бренд) обнуляла всё остальное — люди
 * теряли пол, и выдача переставала соответствовать человеку.
 *
 * fields — ключи, реально пришедшие в JSON. Меняем только их, остальное
 * переносим из текущей версии. Пустой список ключей = менять нечего.
 */
func (s *Store) SavePatch(ctx context.Context, userID int64, p Preferences, fields []string) error {
	cur, err := s.Current(ctx, userID)
	if err != nil {
		return err
	}
	return s.Save(ctx, userID, mergePrefs(cur, p, fields))
}

// mergePrefs накладывает присланные поля на текущую версию паспорта.
// Отдельно от Save, чтобы правило слияния проверялось тестом, а не на людях.
func mergePrefs(cur *Preferences, p Preferences, fields []string) Preferences {
	merged := Preferences{}
	if cur != nil {
		merged = *cur
	}
	// display_name живёт в users, его обрабатывает Save.
	merged.DisplayName = p.DisplayName

	set := make(map[string]bool, len(fields))
	for _, f := range fields {
		set[f] = true
	}
	if set["for_whom"] {
		merged.ForWhom = p.ForWhom
	}
	if set["style_persona_blend"] {
		merged.StylePersonaBlend = p.StylePersonaBlend
	}
	if set["brands_love"] {
		merged.BrandsLove = p.BrandsLove
	}
	if set["brands_avoid"] {
		merged.BrandsAvoid = p.BrandsAvoid
	}
	if set["budget_by_category"] {
		merged.BudgetByCategory = p.BudgetByCategory
	}
	if set["size_by_category"] {
		merged.SizeByCategory = p.SizeByCategory
	}
	if set["lifestyle_allocation"] {
		merged.LifestyleAllocation = p.LifestyleAllocation
	}
	if set["style_self_described"] {
		merged.StyleSelfDescribed = p.StyleSelfDescribed
	}
	if set["style_aspirational"] {
		merged.StyleAspirational = p.StyleAspirational
	}
	if set["desired_mood_default"] {
		merged.DesiredMoodDefault = p.DesiredMoodDefault
	}
	if set["body_love"] {
		merged.BodyLove = p.BodyLove
	}
	if set["body_downplay"] {
		merged.BodyDownplay = p.BodyDownplay
	}
	if set["hard_constraints"] {
		merged.HardConstraints = p.HardConstraints
	}
	return merged
}

// Save пишет ПОЛНУЮ версию паспорта. Для частичных правок — SavePatch.
func (s *Store) Save(ctx context.Context, userID int64, p Preferences) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx,
			`UPDATE user_preferences SET valid_to = now()
			 WHERE user_id = $1 AND valid_to IS NULL`, userID); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO user_preferences (
				user_id, for_whom, style_persona_blend, brands_love, brands_avoid,
				budget_by_category, size_by_category, lifestyle_allocation,
				style_self_described, style_aspirational, desired_mood_default,
				body_love, body_downplay, hard_constraints)
			VALUES ($1,NULLIF($2,''),$3,$4,$5,$6,$7,$8,$9,$10,NULLIF($11,''),$12,$13,$14)`,
			userID, p.ForWhom, p.StylePersonaBlend, p.BrandsLove, p.BrandsAvoid,
			jsonOrEmpty(p.BudgetByCategory), jsonOrEmpty(p.SizeByCategory),
			jsonOrEmpty(p.LifestyleAllocation), p.StyleSelfDescribed, p.StyleAspirational,
			p.DesiredMoodDefault, p.BodyLove, p.BodyDownplay, jsonOrEmpty(p.HardConstraints))
		if err != nil {
			return err
		}
		// Имя — в users (только если пришло непустым, чтобы не затирать).
		if strings.TrimSpace(p.DisplayName) != "" {
			_, err = tx.Exec(ctx,
				`UPDATE users SET display_name = $2 WHERE id = $1`, userID, strings.TrimSpace(p.DisplayName))
		}
		return err
	})
}

// Current — актуальная версия паспорта (valid_to IS NULL) или nil.
func (s *Store) Current(ctx context.Context, userID int64) (*Preferences, error) {
	var p Preferences
	var forWhom, mood *string
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(for_whom,''), COALESCE(style_persona_blend,'{}'),
		       COALESCE(brands_love,'{}'), COALESCE(brands_avoid,'{}'),
		       budget_by_category, size_by_category, lifestyle_allocation,
		       COALESCE(style_self_described,'{}'), COALESCE(style_aspirational,'{}'),
		       COALESCE(desired_mood_default,''), COALESCE(body_love,'{}'),
		       COALESCE(body_downplay,'{}'), hard_constraints
		FROM user_preferences WHERE user_id = $1 AND valid_to IS NULL`, userID).
		Scan(&forWhom, &p.StylePersonaBlend, &p.BrandsLove, &p.BrandsAvoid,
			&p.BudgetByCategory, &p.SizeByCategory, &p.LifestyleAllocation,
			&p.StyleSelfDescribed, &p.StyleAspirational, &mood,
			&p.BodyLove, &p.BodyDownplay, &p.HardConstraints)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if forWhom != nil {
		p.ForWhom = *forWhom
	}
	if mood != nil {
		p.DesiredMoodDefault = *mood
	}
	return &p, nil
}

// RefineFromBehavior — фидбек-петля (LettinGo-паттерн, структурная версия):
// реальные действия (примерки + клики в магазин) усиливают бренд-аффинити
// паспорта. Бренды, с которыми человек взаимодействовал чаще всего и которых
// ещё нет в любимых/нелюбимых, добавляются в brands_love новой версией SCD-2.
// Паспорт становится «живым» — учится из поведения, а не только из онбординга.
// Возвращает добавленные бренды (пусто → нечему учиться, версия не создаётся).
func (s *Store) RefineFromBehavior(ctx context.Context, userID int64, maxAdd int) ([]string, error) {
	if maxAdd <= 0 {
		maxAdd = 3
	}
	rows, err := s.pool.Query(ctx, `
		WITH engaged AS (
		  SELECT b.name AS brand, count(*) AS c
		  FROM tryons t
		  CROSS JOIN LATERAL unnest(t.product_ids) AS pid
		  JOIN products p ON p.public_id = pid
		  JOIN brands b ON b.id = p.brand_id
		  WHERE t.user_id = $1
		  GROUP BY b.name
		  UNION ALL
		  SELECT b.name, count(*)
		  FROM clicks c
		  JOIN products p ON p.id = c.product_id
		  JOIN brands b ON b.id = p.brand_id
		  JOIN chat_sessions cs ON cs.id = c.session_id
		  WHERE cs.user_id = $1
		  GROUP BY b.name
		)
		SELECT brand FROM engaged GROUP BY brand ORDER BY sum(c) DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var engaged []string
	for rows.Next() {
		var b string
		if err := rows.Scan(&b); err != nil {
			return nil, err
		}
		engaged = append(engaged, b)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(engaged) == 0 {
		return nil, nil
	}

	prefs, err := s.Current(ctx, userID)
	if err != nil {
		return nil, err
	}
	if prefs == nil {
		prefs = &Preferences{}
	}
	known := map[string]bool{}
	for _, b := range prefs.BrandsLove {
		known[strings.ToLower(strings.TrimSpace(b))] = true
	}
	for _, b := range prefs.BrandsAvoid {
		known[strings.ToLower(strings.TrimSpace(b))] = true
	}
	var added []string
	for _, b := range engaged {
		if len(added) >= maxAdd {
			break
		}
		if !known[strings.ToLower(strings.TrimSpace(b))] {
			added = append(added, b)
			known[strings.ToLower(strings.TrimSpace(b))] = true
		}
	}
	if len(added) == 0 {
		return nil, nil // всё, с чем взаимодействовали, уже в паспорте
	}
	prefs.BrandsLove = append(prefs.BrandsLove, added...)
	if err := s.Save(ctx, userID, *prefs); err != nil {
		return nil, err
	}
	return added, nil
}

// LogConsent пишет согласие/отзыв 152-ФЗ (версионировано).
func (s *Store) LogConsent(ctx context.Context, userID int64, kind, version string, granted bool, ip string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO consent_logs (user_id, kind, version, granted, ip)
		VALUES ($1, $2, $3, $4, $5)`, userID, kind, version, granted, ip)
	return err
}

type ConsentRecord struct {
	Kind      string `json:"kind"`
	Version   string `json:"version"`
	Granted   bool   `json:"granted"`
	CreatedAt string `json:"created_at"`
}

func (s *Store) Consents(ctx context.Context, userID int64) ([]ConsentRecord, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT kind, version, granted, to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SSZ')
		FROM consent_logs WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ConsentRecord
	for rows.Next() {
		var c ConsentRecord
		if err := rows.Scan(&c.Kind, &c.Version, &c.Granted, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// DeleteBiometric — удаление биометрии в один тап (152-ФЗ, обязательное право).
// Обнуляет колориметрию в user_traits и пишет отзыв согласия в журнал.
func (s *Store) DeleteBiometric(ctx context.Context, userID int64, ip string) error {
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `
			UPDATE user_traits SET skin_lab=NULL, hair_lab=NULL, eye_lab=NULL,
			  undertone=NULL, contrast_level=NULL, season_key=NULL,
			  trait_embedding=NULL, updated_at=now()
			WHERE user_id = $1`, userID); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO consent_logs (user_id, kind, version, granted, ip)
			VALUES ($1, 'biometric_deleted', 'user-request', false, $2)`, userID, ip)
		return err
	})
	if err != nil {
		return err
	}
	// Квитанция — после коммита: письмо «удалили» не должно уйти, если удаление
	// откатилось. Отправляем только по факту, и только если знаем адрес.
	if s.mail != nil {
		var to string
		if e := s.pool.QueryRow(ctx, `SELECT email FROM users WHERE id = $1`, userID).Scan(&to); e == nil && to != "" {
			s.mail.SendAsync(to, mailer.BiometricDeleted(time.Now().Format("02.01.2006")))
		}
	}
	return nil
}

// Summarize — компактная человекочитаемая сводка паспорта для инъекции в чат.
// Пустая строка, если сказать нечего.
func Summarize(p *Preferences) string {
	if p == nil {
		return ""
	}
	var lines []string
	add := func(label string, vals []string) {
		if len(vals) > 0 {
			lines = append(lines, "- "+label+": "+strings.Join(vals, ", "))
		}
	}
	if p.ForWhom != "" {
		who := map[string]string{"female": "женское", "male": "мужское", "any": "без разницы"}[p.ForWhom]
		if who == "" {
			who = p.ForWhom
		}
		lines = append(lines, "- Подбираем: "+who)
	}
	add("Эстетики", p.StylePersonaBlend)
	add("Любимые бренды", p.BrandsLove)
	add("Не носит бренды", p.BrandsAvoid)
	add("Про себя", p.StyleSelfDescribed)
	add("Хочет выглядеть", p.StyleAspirational)
	if p.DesiredMoodDefault != "" {
		lines = append(lines, "- Настроение: "+p.DesiredMoodDefault)
	}
	if len(p.HardConstraints) > 2 { // не "{}"
		lines = append(lines, "- Жёсткие ограничения (исключать всегда): "+string(p.HardConstraints))
	}
	if len(p.BudgetByCategory) > 2 {
		lines = append(lines, "- Бюджет по категориям: "+string(p.BudgetByCategory))
	}
	if len(p.SizeByCategory) > 2 {
		lines = append(lines, "- Размеры: "+string(p.SizeByCategory))
	}
	return strings.Join(lines, "\n")
}
