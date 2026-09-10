// Package collections — избранное и борды покупателя на сервере.
// «Избранное» — дефолтная коллекция (заводится лениво при первом сохранении),
// остальные создаёт человек. Раньше избранное жило в стейте фронта и терялось
// при перезагрузке.
package collections

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const DefaultName = "Избранное"

type Store struct{ pool *pgxpool.Pool }

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// Collection — борд со счётчиком и обложкой (первое фото последнего товара).
type Collection struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	IsDefault bool   `json:"is_default"`
	Count     int    `json:"count"`
	CoverURL  string `json:"cover_url,omitempty"`
}

// EnsureDefault возвращает id дефолтной коллекции, создавая её при первом обращении.
func (s *Store) EnsureDefault(ctx context.Context, userID int64) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM collections WHERE user_id=$1 AND is_default`, userID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	err = s.pool.QueryRow(ctx, `
		INSERT INTO collections (user_id, name, is_default) VALUES ($1,$2,true)
		ON CONFLICT (user_id) WHERE is_default DO UPDATE SET updated_at=now()
		RETURNING id`, userID, DefaultName).Scan(&id)
	return id, err
}

// List — коллекции человека со счётчиками и обложками.
func (s *Store) List(ctx context.Context, userID int64) ([]Collection, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT c.public_id::text, c.name, c.is_default,
		       (SELECT count(*) FROM collection_items ci WHERE ci.collection_id = c.id),
		       COALESCE((
		         SELECT pi.url FROM collection_items ci
		         JOIN product_images pi ON pi.product_id = ci.product_id
		         WHERE ci.collection_id = c.id
		         ORDER BY ci.added_at DESC, pi.position ASC LIMIT 1
		       ),'')
		FROM collections c
		WHERE c.user_id = $1
		ORDER BY c.is_default DESC, c.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Collection{}
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.Name, &c.IsDefault, &c.Count, &c.CoverURL); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// Create заводит именованную коллекцию.
func (s *Store) Create(ctx context.Context, userID int64, name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", errors.New("нужно название")
	}
	var publicID string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO collections (user_id, name) VALUES ($1,$2) RETURNING public_id::text`,
		userID, name).Scan(&publicID)
	return publicID, err
}

// Delete удаляет коллекцию (дефолтную — нельзя).
func (s *Store) Delete(ctx context.Context, userID int64, publicID string) error {
	ct, err := s.pool.Exec(ctx,
		`DELETE FROM collections WHERE user_id=$1 AND public_id::text=$2 AND NOT is_default`,
		userID, publicID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("коллекция не найдена или дефолтная")
	}
	return nil
}

// AddItem кладёт товар в коллекцию (владение проверяется в запросе).
func (s *Store) AddItem(ctx context.Context, userID int64, collectionPublicID, productPublicID string) error {
	ct, err := s.pool.Exec(ctx, `
		INSERT INTO collection_items (collection_id, product_id)
		SELECT c.id, p.id FROM collections c, products p
		WHERE c.user_id=$1 AND c.public_id::text=$2 AND p.public_id::text=$3
		ON CONFLICT DO NOTHING`, userID, collectionPublicID, productPublicID)
	if err != nil {
		return err
	}
	_ = ct
	return nil
}

// RemoveItem убирает товар из коллекции.
func (s *Store) RemoveItem(ctx context.Context, userID int64, collectionPublicID, productPublicID string) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM collection_items ci USING collections c, products p
		WHERE ci.collection_id=c.id AND ci.product_id=p.id
		  AND c.user_id=$1 AND c.public_id::text=$2 AND p.public_id::text=$3`,
		userID, collectionPublicID, productPublicID)
	return err
}

// ToggleDefault — сердце ♡: кладёт/убирает товар из дефолтной коллекции.
// Возвращает, добавлен ли товар после операции.
func (s *Store) ToggleDefault(ctx context.Context, userID int64, productPublicID string) (bool, error) {
	cid, err := s.EnsureDefault(ctx, userID)
	if err != nil {
		return false, err
	}
	var pid int64
	if err := s.pool.QueryRow(ctx,
		`SELECT id FROM products WHERE public_id::text=$1`, productPublicID).Scan(&pid); err != nil {
		return false, errors.New("товар не найден")
	}
	ct, err := s.pool.Exec(ctx,
		`DELETE FROM collection_items WHERE collection_id=$1 AND product_id=$2`, cid, pid)
	if err != nil {
		return false, err
	}
	if ct.RowsAffected() > 0 {
		return false, nil // был — убрали
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO collection_items (collection_id, product_id) VALUES ($1,$2)
		 ON CONFLICT DO NOTHING`, cid, pid)
	return err == nil, err
}

// DefaultProductIDs — public_id товаров в избранном (для гидратации сердечек).
func (s *Store) DefaultProductIDs(ctx context.Context, userID int64) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT p.public_id::text FROM collection_items ci
		JOIN collections c ON c.id = ci.collection_id
		JOIN products p ON p.id = ci.product_id
		WHERE c.user_id=$1 AND c.is_default
		ORDER BY ci.added_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			out = append(out, id)
		}
	}
	return out, rows.Err()
}

// ItemProductIDs — товары конкретной коллекции.
func (s *Store) ItemProductIDs(ctx context.Context, userID int64, collectionPublicID string) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT p.public_id::text FROM collection_items ci
		JOIN collections c ON c.id = ci.collection_id
		JOIN products p ON p.id = ci.product_id
		WHERE c.user_id=$1 AND c.public_id::text=$2
		ORDER BY ci.added_at DESC`, userID, collectionPublicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			out = append(out, id)
		}
	}
	return out, rows.Err()
}
