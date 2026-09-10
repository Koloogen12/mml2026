// import-snapshot переносит каталог из снапшота виджетной БД в схему платформы.
// Источник read-only; запуск идемпотентен (upsert по (brand_id, external_key)).
//
//	go run ./cmd/import-snapshot -project "MakeMeLook — демо-коллекция"
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"

	"github.com/jackc/pgx/v5"

	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/database"
)

const photoBase = "https://admin.makemelook.tech/s3/product-photos/"

type srcProduct struct {
	ID          int
	Name        string
	SKU         *string
	Category    *string // в виджете это уже гардеробная зона
	Subcategory *string
	Gender      *string
	Price       *float64
	Discount    *float64
	Currency    *string
	ProductURL  *string
	Season      []string
	Color       *string
	Material    *string
	Brand       *string
	Sizes       []string
	Description *string
	ExternalID  *string
}

func main() {
	projectName := flag.String("project", "MakeMeLook — демо-коллекция", "имя проекта в снапшоте")
	flag.Parse()

	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		fatal(log, "config", err)
	}
	if cfg.SnapshotDatabaseURL == "" {
		fatal(log, "config", fmt.Errorf("SNAPSHOT_DATABASE_URL не задан"))
	}

	ctx := context.Background()
	src, err := database.Connect(ctx, cfg.SnapshotDatabaseURL)
	if err != nil {
		fatal(log, "snapshot connect", err)
	}
	defer src.Close()
	dst, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		fatal(log, "platform connect", err)
	}
	defer dst.Close()

	rows, err := src.Query(ctx, `
		SELECT p.id, p.name, p.sku, p.category, p.subcategory, p.gender,
		       p.price, p.discount_price, p.currency, p.product_url,
		       COALESCE(p.season,'{}'), p.color, p.material, p.brand,
		       COALESCE(p.sizes,'{}'), p.description, p.external_id
		FROM products p
		JOIN projects pr ON pr.id = p.project_id
		WHERE pr.name = $1 AND p.deleted_at IS NULL AND p.is_active`, *projectName)
	if err != nil {
		fatal(log, "select products", err)
	}
	var items []srcProduct
	var srcIDs []int
	for rows.Next() {
		var it srcProduct
		if err := rows.Scan(&it.ID, &it.Name, &it.SKU, &it.Category, &it.Subcategory, &it.Gender,
			&it.Price, &it.Discount, &it.Currency, &it.ProductURL, &it.Season,
			&it.Color, &it.Material, &it.Brand, &it.Sizes, &it.Description, &it.ExternalID); err != nil {
			fatal(log, "scan", err)
		}
		items = append(items, it)
		srcIDs = append(srcIDs, it.ID)
	}
	rows.Close()
	log.Info("источник прочитан", "products", len(items))

	// Фото одним запросом: product_id → упорядоченные URL.
	photos := map[int][]string{}
	prows, err := src.Query(ctx, `
		SELECT product_id, COALESCE(object_key,''), COALESCE(external_url,'')
		FROM product_photos
		WHERE product_id = ANY($1) AND deleted_at IS NULL
		ORDER BY product_id, sort_order`, srcIDs)
	if err != nil {
		fatal(log, "select photos", err)
	}
	for prows.Next() {
		var pid int
		var key, ext string
		if err := prows.Scan(&pid, &key, &ext); err != nil {
			fatal(log, "scan photo", err)
		}
		switch {
		case key != "":
			photos[pid] = append(photos[pid], photoBase+key)
		case ext != "":
			photos[pid] = append(photos[pid], ext)
		}
	}
	prows.Close()

	tx, err := dst.Begin(ctx)
	if err != nil {
		fatal(log, "begin", err)
	}
	defer tx.Rollback(ctx)

	brandIDs := map[string]int64{}
	var nProducts, nImages, nOffers int

	for _, it := range items {
		brandName := "Разное"
		if it.Brand != nil && strings.TrimSpace(*it.Brand) != "" {
			brandName = strings.TrimSpace(*it.Brand)
		}
		slug := slugify(brandName)
		brandID, ok := brandIDs[slug]
		if !ok {
			if err := tx.QueryRow(ctx, `
				INSERT INTO brands (slug, name) VALUES ($1,$2)
				ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
				RETURNING id`, slug, brandName).Scan(&brandID); err != nil {
				fatal(log, "upsert brand "+slug, err)
			}
			brandIDs[slug] = brandID
		}

		zone := deref(it.Category)
		eligible, reason := tryonEligibility(zone)
		externalKey := fmt.Sprintf("wid-%d", it.ID)
		if it.ExternalID != nil && *it.ExternalID != "" {
			externalKey = *it.ExternalID
		}

		var productID int64
		err := tx.QueryRow(ctx, `
			INSERT INTO products (brand_id, name, description, gender, garment_zone,
			                      category, color, material, season,
			                      tryon_eligible, tryon_ineligible_reason,
			                      source, external_key)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULLIF($11,''),'widget-snapshot',$12)
			ON CONFLICT (brand_id, external_key) DO UPDATE SET
			  name=EXCLUDED.name, description=EXCLUDED.description, gender=EXCLUDED.gender,
			  garment_zone=EXCLUDED.garment_zone, category=EXCLUDED.category,
			  color=EXCLUDED.color, material=EXCLUDED.material, season=EXCLUDED.season,
			  tryon_eligible=EXCLUDED.tryon_eligible,
			  tryon_ineligible_reason=EXCLUDED.tryon_ineligible_reason,
			  updated_at=now()
			RETURNING id`,
			brandID, cleanText(it.Name), deref(it.Description), normGender(deref(it.Gender)), zone,
			deref(it.Subcategory), deref(it.Color), deref(it.Material), it.Season,
			eligible, reason, externalKey).Scan(&productID)
		if err != nil {
			fatal(log, "upsert product "+it.Name, err)
		}
		nProducts++

		// Изображения и офферы перезаписываем целиком — источник каноничен.
		if _, err := tx.Exec(ctx, `DELETE FROM product_images WHERE product_id=$1`, productID); err != nil {
			fatal(log, "clear images", err)
		}
		for i, u := range photos[it.ID] {
			if _, err := tx.Exec(ctx, `
				INSERT INTO product_images (product_id, url, position) VALUES ($1,$2,$3)`,
				productID, u, i); err != nil {
				fatal(log, "insert image", err)
			}
			nImages++
		}

		if it.Price != nil && *it.Price > 0 {
			retailer, rslug := retailerFor(brandName, deref(it.ProductURL))
			price, old := *it.Price, it.Discount
			// В снапшоте discount_price — цена со скидкой; в оффере price = актуальная.
			if old != nil && *old > 0 && *old < price {
				price, old = *old, &price
			} else {
				old = nil
			}
			if _, err := tx.Exec(ctx, `
				INSERT INTO offers (product_id, retailer, retailer_slug, price, old_price,
				                    currency, sizes, in_stock, product_url)
				VALUES ($1,$2,$3,$4,$5,COALESCE(NULLIF($6,''),'RUB'),$7,true,$8)
				ON CONFLICT (product_id, retailer_slug) DO UPDATE SET
				  price=EXCLUDED.price, old_price=EXCLUDED.old_price,
				  sizes=EXCLUDED.sizes, product_url=EXCLUDED.product_url, updated_at=now()`,
				productID, retailer, rslug, price, old,
				deref(it.Currency), it.Sizes, deref(it.ProductURL)); err != nil {
				fatal(log, "upsert offer", err)
			}
			nOffers++
		}
	}

	if err := tx.Commit(ctx); err != nil {
		fatal(log, "commit", err)
	}
	log.Info("импорт завершён", "brands", len(brandIDs), "products", nProducts, "images", nImages, "offers", nOffers)
	_ = pgx.ErrNoRows
}

// tryonEligibility — гейт по 5 зонам: одежда примеряется, обувь и аксессуары пока нет.
func tryonEligibility(zone string) (bool, string) {
	switch zone {
	case "tops", "bottoms", "outerwear":
		return true, ""
	case "shoes":
		return false, "Обувь пока не поддерживается примеркой"
	case "accessories":
		return false, "Аксессуары примерка не поддерживает"
	default:
		return false, "Категория вне поддерживаемых зон"
	}
}

func retailerFor(brand, productURL string) (string, string) {
	if u, err := url.Parse(productURL); err == nil && u.Host != "" {
		host := strings.TrimPrefix(u.Host, "www.")
		return brand, slugify(host)
	}
	return brand, slugify(brand)
}

func normGender(g string) string {
	switch strings.ToLower(g) {
	case "male", "m", "мужской":
		return "male"
	case "female", "f", "женский":
		return "female"
	case "":
		return ""
	default:
		return "unisex"
	}
}

func slugify(s string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	clean, _, err := transform.String(t, s)
	if err != nil {
		clean = s
	}
	clean = strings.ToLower(clean)
	var b strings.Builder
	prev := false
	for _, r := range clean {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
			prev = false
		case r >= 'а' && r <= 'я' || r == 'ё':
			b.WriteRune(r) // кириллические слаги допустимы
			prev = false
		default:
			if !prev && b.Len() > 0 {
				b.WriteByte('-')
				prev = true
			}
		}
	}
	return strings.Trim(b.String(), "-")
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return cleanText(*s)
}

// cleanText убирает zero-width мусор и лишние пробелы из источника.
func cleanText(s string) string {
	s = strings.Map(func(r rune) rune {
		switch r {
		case '\u200b', '\u200c', '\u200d', '\ufeff':
			return -1
		}
		return r
	}, s)
	return strings.TrimSpace(s)
}

func fatal(log *slog.Logger, msg string, err error) {
	log.Error(msg, "err", err)
	os.Exit(1)
}
