// Package blog — статьи блога: черновики, расписание, публикация, медиатека.
//
// Портировано с модуля-донора (BLOG-ADMIN-MODULE-SPEC.md), но бэкенд написан
// заново: донор на Express+Drizzle, мы на chi+pgx. Осознанные отличия:
//   - HTML из редактора САНИТИЗИРУЕТСЯ перед сохранением (донор клиентский
//     HTML клал в базу как есть, а публичная страница рендерит его сырым);
//   - медиа в MinIO, а не на локальном диске;
//   - одноязычно (lang всегда 'ru'), без RU↔EN связки;
//   - без AI-обложки: обложки готовятся отдельно, руками.
package blog

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/microcosm-cc/bluemonday"
)

// Теги блога — рубрикация под покупателя (audience-profile.md §4, слой L3).
// Список осознанно короткий: рубрикатор, который никто не ведёт, гниёт.
var Tags = []string{"Гардероб", "Как носить", "Размер и посадка", "Бренды", "Примерка", "Сезон"}

func ValidTag(t string) bool {
	for _, x := range Tags {
		if x == t {
			return true
		}
	}
	return t == ""
}

type Store struct{ pool *pgxpool.Pool }

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// Post — статья. ContentJSON отдаём только в админку (редактору),
// публичной странице нужен лишь HTML.
type Post struct {
	ID             string          `json:"id"`
	Slug           string          `json:"slug"`
	Title          string          `json:"title"`
	Excerpt        string          `json:"excerpt"`
	ContentJSON    json.RawMessage `json:"content_json,omitempty"`
	ContentHTML    string          `json:"content_html,omitempty"`
	CoverImage     string          `json:"cover_image"`
	Tag            string          `json:"tag"`
	Status         string          `json:"status"`
	Featured       bool            `json:"featured"`
	ReadingTime    int             `json:"reading_time"`
	AuthorID       string          `json:"author_id,omitempty"`
	AuthorName     string          `json:"author_name,omitempty"`
	SEOTitle       string          `json:"seo_title"`
	SEODescription string          `json:"seo_description"`
	PublishedAt    *time.Time      `json:"published_at,omitempty"`
	ScheduledAt    *time.Time      `json:"scheduled_at,omitempty"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// Author — автор статьи.
type Author struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Bio       string `json:"bio"`
}

// Media — файл медиатеки.
type Media struct {
	ID        string    `json:"id"`
	Filename  string    `json:"filename"`
	URL       string    `json:"url"`
	MimeType  string    `json:"mime_type"`
	SizeBytes int64     `json:"size_bytes"`
	CreatedAt time.Time `json:"created_at"`
}

// ── Санитайзер ──────────────────────────────────────────────────────────────
// Разрешаем ровно то, что умеет производить редактор: заголовки, списки,
// таблицы, картинки, ссылки, выделения, коллауты (div[data-callout]).
var policy = func() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	p.AllowElements("h1", "h2", "h3", "figure", "figcaption", "u", "s", "mark", "hr")
	p.AllowTables()
	p.AllowAttrs("id").OnElements("h2", "h3")
	p.AllowAttrs("class").OnElements("div", "p", "span", "figure", "img", "blockquote")
	// Коллауты: <div data-callout="info|warn|tip">…</div>
	p.AllowAttrs("data-callout").Matching(regexp.MustCompile(`^(info|warn|tip)$`)).OnElements("div")
	p.AllowAttrs("src", "alt", "title", "width", "height").OnElements("img")
	p.AllowStandardURLs()
	p.RequireNoFollowOnLinks(true)
	p.AddTargetBlankToFullyQualifiedLinks(true)
	return p
}()

func Sanitize(html string) string { return policy.Sanitize(html) }

// ── Хелперы ─────────────────────────────────────────────────────────────────

var translit = map[rune]string{
	'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d", 'е': "e", 'ё': "yo",
	'ж': "zh", 'з': "z", 'и': "i", 'й': "y", 'к': "k", 'л': "l", 'м': "m",
	'н': "n", 'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t", 'у': "u",
	'ф': "f", 'х': "kh", 'ц': "ts", 'ч': "ch", 'ш': "sh", 'щ': "sch",
	'ъ': "", 'ы': "y", 'ь': "", 'э': "e", 'ю': "yu", 'я': "ya",
}

var (
	reNonSlug = regexp.MustCompile(`[^a-z0-9\s-]`)
	reSpace   = regexp.MustCompile(`\s+`)
	reDashes  = regexp.MustCompile(`-+`)
	reTags    = regexp.MustCompile(`<[^>]+>`)
	reHeading = regexp.MustCompile(`(?is)<h([23])([^>]*)>(.*?)</h[23]>`)
)

// Slugify — кириллица → латиница (карта транслитерации из донора).
func Slugify(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if v, ok := translit[r]; ok {
			b.WriteString(v)
		} else {
			b.WriteRune(r)
		}
	}
	out := reNonSlug.ReplaceAllString(b.String(), "")
	out = reSpace.ReplaceAllString(strings.TrimSpace(out), "-")
	out = reDashes.ReplaceAllString(out, "-")
	out = strings.Trim(out, "-")
	if len(out) > 60 {
		out = strings.Trim(out[:60], "-")
	}
	return out
}

// AddHeadingIDs проставляет уникальные id на h2/h3 — из них строится оглавление.
func AddHeadingIDs(html string) string {
	used := map[string]bool{}
	return reHeading.ReplaceAllStringFunc(html, func(m string) string {
		g := reHeading.FindStringSubmatch(m)
		level, attrs, content := g[1], g[2], g[3]
		// уже проставленный id не трогаем
		if strings.Contains(strings.ToLower(attrs), "id=") {
			return m
		}
		id := Slugify(strings.TrimSpace(reTags.ReplaceAllString(content, "")))
		if id == "" {
			id = "section"
		}
		uniq := id
		for i := 1; used[uniq]; i++ {
			uniq = fmt.Sprintf("%s-%d", id, i)
		}
		used[uniq] = true
		return fmt.Sprintf("<h%s id=%q%s>%s</h%s>", level, uniq, attrs, content, level)
	})
}

// ReadingTime — минуты чтения (~180 слов/мин для русского текста).
func ReadingTime(html string) int {
	text := reTags.ReplaceAllString(html, " ")
	n := len(strings.Fields(text))
	if n == 0 {
		return 0
	}
	if m := n / 180; m > 0 {
		return m
	}
	return 1
}

// ── Посты ───────────────────────────────────────────────────────────────────

// PostInput — то, что присылает редактор.
type PostInput struct {
	Slug           string          `json:"slug"`
	Title          string          `json:"title"`
	Excerpt        string          `json:"excerpt"`
	ContentJSON    json.RawMessage `json:"content_json"`
	ContentHTML    string          `json:"content_html"`
	CoverImage     string          `json:"cover_image"`
	Tag            string          `json:"tag"`
	Featured       bool            `json:"featured"`
	AuthorID       string          `json:"author_id"`
	SEOTitle       string          `json:"seo_title"`
	SEODescription string          `json:"seo_description"`
}

const postCols = `p.public_id::text, p.slug, p.title, p.excerpt, p.cover_image, p.tag,
	p.status, p.featured, p.reading_time, COALESCE(a.public_id::text,''),
	COALESCE(a.name,''), p.seo_title, p.seo_description,
	p.published_at, p.scheduled_at, p.updated_at`

func scanPost(row pgx.Row, p *Post) error {
	return row.Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.CoverImage, &p.Tag,
		&p.Status, &p.Featured, &p.ReadingTime, &p.AuthorID, &p.AuthorName,
		&p.SEOTitle, &p.SEODescription, &p.PublishedAt, &p.ScheduledAt, &p.UpdatedAt)
}

// List — админский список с фильтрами.
func (s *Store) List(ctx context.Context, status, q string) ([]Post, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+postCols+`
		FROM blog_posts p LEFT JOIN blog_authors a ON a.id = p.author_id
		WHERE ($1 = '' OR p.status = $1)
		  AND ($2 = '' OR p.title ILIKE '%'||$2||'%' OR p.slug ILIKE '%'||$2||'%')
		ORDER BY p.updated_at DESC LIMIT 200`, status, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Post{}
	for rows.Next() {
		var p Post
		if err := scanPost(rows, &p); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// Get — один пост со всем содержимым (для редактора).
func (s *Store) Get(ctx context.Context, publicID string) (*Post, error) {
	var p Post
	var cj []byte
	err := s.pool.QueryRow(ctx, `
		SELECT `+postCols+`, p.content_json, p.content_html
		FROM blog_posts p LEFT JOIN blog_authors a ON a.id = p.author_id
		WHERE p.public_id::text = $1`, publicID).
		Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.CoverImage, &p.Tag,
			&p.Status, &p.Featured, &p.ReadingTime, &p.AuthorID, &p.AuthorName,
			&p.SEOTitle, &p.SEODescription, &p.PublishedAt, &p.ScheduledAt, &p.UpdatedAt,
			&cj, &p.ContentHTML)
	if err != nil {
		return nil, err
	}
	p.ContentJSON = cj
	return &p, nil
}

// GetPublic — опубликованный пост по slug (для публичной страницы).
// Черновик или пост с будущим временем публикации не отдаём.
func (s *Store) GetPublic(ctx context.Context, slug string) (*Post, error) {
	var p Post
	err := s.pool.QueryRow(ctx, `
		SELECT `+postCols+`, p.content_html
		FROM blog_posts p LEFT JOIN blog_authors a ON a.id = p.author_id
		WHERE p.slug = $1 AND p.status = 'published'
		  AND (p.published_at IS NULL OR p.published_at <= now())`, slug).
		Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.CoverImage, &p.Tag,
			&p.Status, &p.Featured, &p.ReadingTime, &p.AuthorID, &p.AuthorName,
			&p.SEOTitle, &p.SEODescription, &p.PublishedAt, &p.ScheduledAt, &p.UpdatedAt,
			&p.ContentHTML)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// ListPublic — лента опубликованных постов.
func (s *Store) ListPublic(ctx context.Context, tag string, limit int) ([]Post, error) {
	if limit <= 0 || limit > 50 {
		limit = 24
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+postCols+`
		FROM blog_posts p LEFT JOIN blog_authors a ON a.id = p.author_id
		WHERE p.status = 'published' AND (p.published_at IS NULL OR p.published_at <= now())
		  AND ($1 = '' OR p.tag = $1)
		ORDER BY p.featured DESC, p.published_at DESC NULLS LAST
		LIMIT $2`, tag, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Post{}
	for rows.Next() {
		var p Post
		if err := scanPost(rows, &p); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// uniqueSlug подбирает свободный slug (slug уникален в пределах языка).
func (s *Store) uniqueSlug(ctx context.Context, base, exceptPublicID string) (string, error) {
	if base == "" {
		base = "post"
	}
	slug := base
	for i := 1; ; i++ {
		var exists bool
		err := s.pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM blog_posts WHERE slug=$1 AND lang='ru'
			   AND ($2 = '' OR public_id::text <> $2))`, slug, exceptPublicID).Scan(&exists)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
}

func (s *Store) authorPK(ctx context.Context, publicID string) *int64 {
	if publicID == "" {
		return nil
	}
	var id int64
	if s.pool.QueryRow(ctx, `SELECT id FROM blog_authors WHERE public_id::text=$1`, publicID).Scan(&id) != nil {
		return nil
	}
	return &id
}

// Create заводит черновик.
func (s *Store) Create(ctx context.Context, in PostInput) (string, error) {
	if strings.TrimSpace(in.Title) == "" {
		return "", errors.New("нужен заголовок")
	}
	if !ValidTag(in.Tag) {
		return "", errors.New("неизвестная рубрика")
	}
	base := in.Slug
	if base == "" {
		base = Slugify(in.Title)
	}
	slug, err := s.uniqueSlug(ctx, base, "")
	if err != nil {
		return "", err
	}
	html := AddHeadingIDs(Sanitize(in.ContentHTML))
	var publicID string
	err = s.pool.QueryRow(ctx, `
		INSERT INTO blog_posts (slug, title, excerpt, content_json, content_html,
			cover_image, tag, featured, reading_time, author_id, seo_title, seo_description)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING public_id::text`,
		slug, in.Title, in.Excerpt, nullJSON(in.ContentJSON), html,
		in.CoverImage, in.Tag, in.Featured, ReadingTime(html),
		s.authorPK(ctx, in.AuthorID), in.SEOTitle, in.SEODescription).Scan(&publicID)
	return publicID, err
}

// Update правит пост.
func (s *Store) Update(ctx context.Context, publicID string, in PostInput) error {
	if !ValidTag(in.Tag) {
		return errors.New("неизвестная рубрика")
	}
	base := in.Slug
	if base == "" {
		base = Slugify(in.Title)
	}
	slug, err := s.uniqueSlug(ctx, base, publicID)
	if err != nil {
		return err
	}
	html := AddHeadingIDs(Sanitize(in.ContentHTML))
	ct, err := s.pool.Exec(ctx, `
		UPDATE blog_posts SET slug=$2, title=$3, excerpt=$4, content_json=$5,
			content_html=$6, cover_image=$7, tag=$8, featured=$9, reading_time=$10,
			author_id=$11, seo_title=$12, seo_description=$13, updated_at=now()
		WHERE public_id::text=$1`,
		publicID, slug, in.Title, in.Excerpt, nullJSON(in.ContentJSON), html,
		in.CoverImage, in.Tag, in.Featured, ReadingTime(html),
		s.authorPK(ctx, in.AuthorID), in.SEOTitle, in.SEODescription)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("пост не найден")
	}
	return nil
}

// Publish — публикация сейчас, по расписанию или снятие в черновик.
func (s *Store) Publish(ctx context.Context, publicID, status string, at *time.Time) error {
	switch status {
	case "draft":
		_, err := s.pool.Exec(ctx,
			`UPDATE blog_posts SET status='draft', scheduled_at=NULL, updated_at=now()
			 WHERE public_id::text=$1`, publicID)
		return err
	case "published":
		_, err := s.pool.Exec(ctx,
			`UPDATE blog_posts SET status='published', published_at=COALESCE(published_at, now()),
			   scheduled_at=NULL, updated_at=now() WHERE public_id::text=$1`, publicID)
		return err
	case "scheduled":
		if at == nil || at.Before(time.Now()) {
			return errors.New("время публикации должно быть в будущем")
		}
		// scheduled — это опубликованный пост с будущей датой: публичные
		// выборки сами не покажут его, пока published_at не наступит.
		_, err := s.pool.Exec(ctx,
			`UPDATE blog_posts SET status='published', published_at=$2, scheduled_at=$2,
			   updated_at=now() WHERE public_id::text=$1`, publicID, *at)
		return err
	}
	return errors.New("неизвестный статус")
}

// Duplicate копирует пост в черновик.
func (s *Store) Duplicate(ctx context.Context, publicID string) (string, error) {
	src, err := s.Get(ctx, publicID)
	if err != nil {
		return "", errors.New("пост не найден")
	}
	slug, err := s.uniqueSlug(ctx, src.Slug+"-copy", "")
	if err != nil {
		return "", err
	}
	var newID string
	err = s.pool.QueryRow(ctx, `
		INSERT INTO blog_posts (slug, title, excerpt, content_json, content_html,
			cover_image, tag, reading_time, seo_title, seo_description, author_id)
		SELECT $2, title || ' (копия)', excerpt, content_json, content_html,
			cover_image, tag, reading_time, seo_title, seo_description, author_id
		FROM blog_posts WHERE public_id::text=$1
		RETURNING public_id::text`, publicID, slug).Scan(&newID)
	return newID, err
}

func (s *Store) Delete(ctx context.Context, publicID string) error {
	ct, err := s.pool.Exec(ctx, `DELETE FROM blog_posts WHERE public_id::text=$1`, publicID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("пост не найден")
	}
	return nil
}

// ── Авторы ──────────────────────────────────────────────────────────────────

func (s *Store) Authors(ctx context.Context) ([]Author, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT public_id::text, name, avatar_url, bio FROM blog_authors ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Author{}
	for rows.Next() {
		var a Author
		if err := rows.Scan(&a.ID, &a.Name, &a.AvatarURL, &a.Bio); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) CreateAuthor(ctx context.Context, name, avatarURL, bio string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", errors.New("нужно имя автора")
	}
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO blog_authors (name, avatar_url, bio) VALUES ($1,$2,$3)
		 RETURNING public_id::text`, name, avatarURL, bio).Scan(&id)
	return id, err
}

// ── Медиатека ───────────────────────────────────────────────────────────────

func (s *Store) AddMedia(ctx context.Context, m Media, storagePath string, uploadedBy *int64) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO blog_media (filename, storage_path, url, mime_type, size_bytes, uploaded_by)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING public_id::text`,
		m.Filename, storagePath, m.URL, m.MimeType, m.SizeBytes, uploadedBy).Scan(&id)
	return id, err
}

func (s *Store) Media(ctx context.Context) ([]Media, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT public_id::text, filename, url, mime_type, size_bytes, created_at
		FROM blog_media ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Media{}
	for rows.Next() {
		var m Media
		if err := rows.Scan(&m.ID, &m.Filename, &m.URL, &m.MimeType, &m.SizeBytes, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// DeleteMedia убирает запись из медиатеки. Объект в MinIO не трогаем:
// он мог быть уже вставлен в опубликованную статью.
func (s *Store) DeleteMedia(ctx context.Context, publicID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM blog_media WHERE public_id::text=$1`, publicID)
	return err
}

func nullJSON(b json.RawMessage) any {
	if len(b) == 0 {
		return nil
	}
	return []byte(b)
}
