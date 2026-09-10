package repository

import (
	"context"
	"strings"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type ProductGroupRepository struct {
	db *gorm.DB
}

func newProductGroupRepository(db *gorm.DB) *ProductGroupRepository {
	return &ProductGroupRepository{db: db}
}

func (r *ProductGroupRepository) GetByID(ctx context.Context, id int) (*model.ProductGroup, error) {
	var group model.ProductGroup
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&group).Error
	return queryResult(&group, err)
}

func (r *ProductGroupRepository) GetByIDAndProjectID(ctx context.Context, id int, projectID int) (*model.ProductGroup, error) {
	var group model.ProductGroup
	err := r.db.WithContext(ctx).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		First(&group).Error
	return queryResult(&group, err)
}

func (r *ProductGroupRepository) ListByProjectID(ctx context.Context, projectID int) ([]*model.ProductGroup, error) {
	var groups []*model.ProductGroup
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("name ASC").
		Find(&groups).Error
	return groups, dbErr(err)
}

func (r *ProductGroupRepository) Create(ctx context.Context, group *model.ProductGroup) error {
	return dbErr(r.db.WithContext(ctx).Create(group).Error)
}

// CreateWithProducts creates a group and syncs its products in a single transaction.
func (r *ProductGroupRepository) CreateWithProducts(ctx context.Context, group *model.ProductGroup, productIDs []int) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(group).Error; err != nil {
			return dbErr(err)
		}
		return syncProductsInTx(tx, group.ID, productIDs)
	})
}

func (r *ProductGroupRepository) UpdateAll(ctx context.Context, id int, updates map[string]any) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.ProductGroup{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates).Error)
}

// UpdateWithProducts updates a group and syncs its products in a single transaction.
func (r *ProductGroupRepository) UpdateWithProducts(ctx context.Context, groupID int, updates map[string]any, productIDs []int) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.ProductGroup{}).
			Where("id = ? AND deleted_at IS NULL", groupID).
			Updates(updates).Error; err != nil {
			return dbErr(err)
		}
		return syncProductsInTx(tx, groupID, productIDs)
	})
}

// syncProductsInTx replaces the group's product list with productIDs inside an existing transaction:
// soft-deletes associations not in the list, then upserts the ones that should be there.
func syncProductsInTx(tx *gorm.DB, groupID int, productIDs []int) error {
	if len(productIDs) == 0 {
		return dbErr(tx.Exec(
			"UPDATE product_group_items SET deleted_at = CURRENT_TIMESTAMP WHERE group_id = ? AND deleted_at IS NULL",
			groupID,
		).Error)
	}

	if err := tx.Exec(
		"UPDATE product_group_items SET deleted_at = CURRENT_TIMESTAMP WHERE group_id = ? AND deleted_at IS NULL AND product_id NOT IN ?",
		groupID, productIDs,
	).Error; err != nil {
		return dbErr(err)
	}

	placeholders := make([]string, len(productIDs))
	args := make([]any, 0, len(productIDs)*2)
	for i, productID := range productIDs {
		placeholders[i] = "(?, ?)"
		args = append(args, productID, groupID)
	}
	query := "INSERT INTO product_group_items (product_id, group_id) VALUES " +
		strings.Join(placeholders, ", ") +
		" ON CONFLICT (product_id, group_id) DO UPDATE SET deleted_at = NULL"
	return dbErr(tx.Exec(query, args...).Error)
}

func (r *ProductGroupRepository) Delete(ctx context.Context, id int) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.ProductGroup{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")).Error)
}

// AddProductsToGroup inserts product-group associations, restoring soft-deleted ones if they exist.
func (r *ProductGroupRepository) AddProductsToGroup(ctx context.Context, groupID int, productIDs []int) error {
	for _, productID := range productIDs {
		err := r.db.WithContext(ctx).Exec(`
			INSERT INTO product_group_items (product_id, group_id)
			VALUES (?, ?)
			ON CONFLICT (product_id, group_id) DO UPDATE SET deleted_at = NULL`,
			productID, groupID).Error
		if err != nil {
			return dbErr(err)
		}
	}
	return nil
}

// RemoveProductFromGroup soft-deletes a product-group association.
func (r *ProductGroupRepository) RemoveProductFromGroup(ctx context.Context, groupID int, productID int) error {
	return dbErr(r.db.WithContext(ctx).Exec(`
		UPDATE product_group_items
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE group_id = ? AND product_id = ? AND deleted_at IS NULL`,
		groupID, productID).Error)
}

// CountProducts returns the number of active products in a group.
func (r *ProductGroupRepository) CountProducts(ctx context.Context, groupID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("product_group_items").
		Where("group_id = ? AND deleted_at IS NULL", groupID).
		Count(&count).Error
	return count, dbErr(err)
}

// CountProductsByGroupIDs returns product counts for multiple groups in a single query.
// Returns a map of groupID → count.
func (r *ProductGroupRepository) CountProductsByGroupIDs(ctx context.Context, groupIDs []int) (map[int]int64, error) {
	if len(groupIDs) == 0 {
		return map[int]int64{}, nil
	}

	type row struct {
		GroupID int
		Count   int64
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Table("product_group_items").
		Select("group_id, COUNT(*) AS count").
		Where("group_id IN ? AND deleted_at IS NULL", groupIDs).
		Group("group_id").
		Scan(&rows).Error
	if err != nil {
		return nil, dbErr(err)
	}

	counts := make(map[int]int64, len(rows))
	for _, row := range rows {
		counts[row.GroupID] = row.Count
	}
	return counts, nil
}
