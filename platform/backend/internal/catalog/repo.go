package catalog

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

const productSelect = `
SELECT p.public_id, p.name, COALESCE(p.description,''), COALESCE(p.gender,''),
       COALESCE(p.garment_zone,''), COALESCE(p.category,''), COALESCE(p.subcategory,''),
       COALESCE(p.color,''), COALESCE(p.material,''), p.attributes, p.tryon_eligible,
       b.slug, b.name, COALESCE(b.logo_url,'')
FROM products p
JOIN brands b ON b.id = p.brand_id`

// List — фильтровый листинг. Векторный поиск подключается поверх (search.go),
// этот путь остаётся как fallback и как источник для точных фильтров.
func (r *Repo) List(ctx context.Context, f ListFilter) ([]Product, error) {
	var (
		where []string
		args  []any
	)
	add := func(cond string, val any) {
		args = append(args, val)
		where = append(where, fmt.Sprintf(cond, len(args)))
	}

	where = append(where, "p.deleted_at IS NULL", "p.is_active")
	if f.Zone != "" {
		add("p.garment_zone = $%d", f.Zone)
	}
	if f.Gender != "" {
		add("(p.gender = $%d OR p.gender = 'unisex' OR p.gender = '')", f.Gender)
	}
	if f.Brand != "" {
		add("b.slug = $%d", f.Brand)
	}
	if len(f.IDs) > 0 {
		add("p.public_id::text = ANY($%d)", f.IDs)
	}
	if f.Query != "" {
		args = append(args, f.Query)
		n := len(args)
		where = append(where, fmt.Sprintf(
			"(p.name ILIKE '%%'||$%d||'%%' OR p.description ILIKE '%%'||$%d||'%%')", n, n))
	}
	if f.MinPrice > 0 {
		add("EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.in_stock AND o.price >= $%d)", f.MinPrice)
	}
	if f.MaxPrice > 0 {
		add("EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.in_stock AND o.price <= $%d)", f.MaxPrice)
	}

	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 24
	}
	q := productSelect + "\nWHERE " + strings.Join(where, " AND ") +
		fmt.Sprintf("\nORDER BY p.id DESC LIMIT %d OFFSET %d", limit, max(f.Offset, 0))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanAndHydrate(ctx, rows)
}

func (r *Repo) GetByPublicID(ctx context.Context, publicID string) (*Product, error) {
	rows, err := r.pool.Query(ctx, productSelect+" WHERE p.public_id = $1 AND p.deleted_at IS NULL", publicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items, err := r.scanAndHydrate(ctx, rows)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, pgx.ErrNoRows
	}
	return &items[0], nil
}

// Brands — бренды, у которых есть живые товары. Пустые не отдаём: их
// показывал онбординг («выберите любимые бренды»), выбор уходил в паспорт
// и поднимал в выдаче бренд, товаров которого не существует.
// gender — только бренды с вещами для этого пола (unisex подмешивается).
func (r *Repo) Brands(ctx context.Context, gender string) ([]Brand, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT b.slug, b.name, COALESCE(b.logo_url,''), COALESCE(b.description,'')
		 FROM brands b
		 WHERE EXISTS (
		   SELECT 1 FROM products p
		   WHERE p.brand_id = b.id AND p.deleted_at IS NULL AND p.is_active
		     AND ($1 = '' OR p.gender = $1 OR p.gender = 'unisex' OR p.gender = '')
		 )
		 ORDER BY b.name`, gender)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Brand
	for rows.Next() {
		var b Brand
		if err := rows.Scan(&b.Slug, &b.Name, &b.LogoURL, &b.Description); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func (r *Repo) scanAndHydrate(ctx context.Context, rows pgx.Rows) ([]Product, error) {
	var out []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.PublicID, &p.Name, &p.Description, &p.Gender,
			&p.GarmentZone, &p.Category, &p.Subcategory, &p.Color, &p.Material,
			&p.Attributes, &p.TryonEligible,
			&p.Brand.Slug, &p.Brand.Name, &p.Brand.LogoURL); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return r.hydrateByPublicIDs(ctx, out)
}

// hydrateByPublicIDs батчем догружает фото и офферы к уже отсканированным товарам.
func (r *Repo) hydrateByPublicIDs(ctx context.Context, out []Product) ([]Product, error) {
	if len(out) == 0 {
		return out, nil
	}

	ids := make([]string, len(out))
	idx := make(map[string]int, len(out))
	for i, p := range out {
		ids[i] = p.PublicID
		idx[p.PublicID] = i
	}

	imgRows, err := r.pool.Query(ctx, `
		SELECT p.public_id, i.url, i.position, i.kind
		FROM product_images i JOIN products p ON p.id = i.product_id
		WHERE p.public_id = ANY($1) ORDER BY i.position`, ids)
	if err != nil {
		return nil, err
	}
	defer imgRows.Close()
	for imgRows.Next() {
		var pid string
		var img Image
		if err := imgRows.Scan(&pid, &img.URL, &img.Position, &img.Kind); err != nil {
			return nil, err
		}
		out[idx[pid]].Images = append(out[idx[pid]].Images, img)
	}

	offRows, err := r.pool.Query(ctx, `
		SELECT p.public_id, o.retailer, o.retailer_slug, o.price, o.old_price,
		       o.currency, COALESCE(o.sizes,'{}'), o.in_stock, o.product_url
		FROM offers o JOIN products p ON p.id = o.product_id
		WHERE p.public_id = ANY($1) ORDER BY o.price`, ids)
	if err != nil {
		return nil, err
	}
	defer offRows.Close()
	for offRows.Next() {
		var pid string
		var o Offer
		if err := offRows.Scan(&pid, &o.Retailer, &o.RetailerSlug, &o.Price, &o.OldPrice,
			&o.Currency, &o.Sizes, &o.InStock, &o.ProductURL); err != nil {
			return nil, err
		}
		out[idx[pid]].Offers = append(out[idx[pid]].Offers, o)
	}
	return out, nil
}

// TasteBrand — бренд из справочника вкуса (см. миграцию 000019).
type TasteBrand struct {
	Name  string `json:"name"`
	Grade string `json:"grade"`
}

// TasteBrands — что человек носит и на что равняется. НЕ ограничено каталогом:
// «любимые бренды» — сигнал вкуса, а не фильтр витрины. Наличие бренда у нас
// решает разметка аналогов, а не этот список.
func (r *Repo) TasteBrands(ctx context.Context, gender string) ([]TasteBrand, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT name, grade FROM taste_brands
		WHERE $1 = '' OR gender = $1 OR gender = 'unisex'
		ORDER BY rank, name`, gender)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []TasteBrand{}
	for rows.Next() {
		var b TasteBrand
		if err := rows.Scan(&b.Name, &b.Grade); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// AnalogsFor — бренды каталога, которыми можно заменить перечисленные бренды
// вкуса. Сопоставление по имени без учёта регистра: в паспорте лежит то, что
// человек выбрал в онбординге, то есть имя из справочника вкуса.
func (r *Repo) AnalogsFor(ctx context.Context, tasteNames []string) ([]string, error) {
	if len(tasteNames) == 0 {
		return nil, nil
	}
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT b.name
		FROM taste_brands tb
		JOIN brand_analogs a ON a.taste_brand_id = tb.id
		JOIN brands b ON b.id = a.brand_id
		WHERE lower(tb.name) = ANY($1)`, tasteNames)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var n string
		if rows.Scan(&n) == nil {
			out = append(out, n)
		}
	}
	return out, rows.Err()
}
