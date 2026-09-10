package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

var ErrPhotoNotAttachable = errors.New("photo cannot be attached: not found or unauthorized")

type ProductPhotoRepository struct {
	db *gorm.DB
}

func newProductPhotoRepository(db *gorm.DB) *ProductPhotoRepository {
	return &ProductPhotoRepository{db: db}
}

func (r *ProductPhotoRepository) Create(ctx context.Context, photo *model.ProductPhoto) error {
	return dbErr(r.db.WithContext(ctx).Create(photo).Error)
}

func (r *ProductPhotoRepository) GetByID(ctx context.Context, id int) (*model.ProductPhoto, error) {
	var photo model.ProductPhoto
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&photo).Error
	return queryResult(&photo, err)
}

func (r *ProductPhotoRepository) GetByIDAndProductID(ctx context.Context, id int, productID int) (*model.ProductPhoto, error) {
	var photo model.ProductPhoto
	err := r.db.WithContext(ctx).
		Where("id = ? AND product_id = ? AND deleted_at IS NULL", id, productID).
		First(&photo).Error
	return queryResult(&photo, err)
}

func (r *ProductPhotoRepository) ListByProductID(ctx context.Context, productID int) ([]*model.ProductPhoto, error) {
	var photos []*model.ProductPhoto
	err := r.db.WithContext(ctx).
		Where("product_id = ? AND deleted_at IS NULL", productID).
		Order("sort_order ASC").
		Find(&photos).Error
	return photos, dbErr(err)
}

func (r *ProductPhotoRepository) CountByProductID(ctx context.Context, productID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ProductPhoto{}).
		Where("product_id = ? AND deleted_at IS NULL", productID).
		Count(&count).Error
	return count, dbErr(err)
}

// Delete soft-deletes a photo.
func (r *ProductPhotoRepository) Delete(ctx context.Context, id int) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.ProductPhoto{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")).Error)
}

// DeleteNotInList soft-deletes all photos for a product that are not in keepIDs.
// If keepIDs is empty, all photos for the product are soft-deleted.
func (r *ProductPhotoRepository) DeleteNotInList(ctx context.Context, productID int, keepIDs []int) error {
	q := r.db.WithContext(ctx).
		Model(&model.ProductPhoto{}).
		Where("product_id = ? AND deleted_at IS NULL", productID)

	if len(keepIDs) > 0 {
		q = q.Where("id NOT IN (?)", keepIDs)
	}

	return dbErr(q.Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")).Error)
}

// AttachToProduct sets product_id and sort_order on a photo that was uploaded
// without a product (product_id IS NULL). Verifies the photo belongs to the correct
// project and was uploaded by uploadedBy.
func (r *ProductPhotoRepository) AttachToProduct(ctx context.Context, photoID, uploadedBy, projectID, productID, sortOrder int) error {
	result := r.db.WithContext(ctx).
		Model(&model.ProductPhoto{}).
		Where("id = ? AND uploaded_by = ? AND project_id = ? AND product_id IS NULL AND deleted_at IS NULL", photoID, uploadedBy, projectID).
		Updates(map[string]any{"product_id": productID, "sort_order": sortOrder})

	if result.Error != nil {
		return dbErr(result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrPhotoNotAttachable
	}
	return nil
}

// PhotoSortOrder holds a photo ID and its desired position.
type PhotoSortOrder struct {
	ID        int
	SortOrder int
}

// UpdateSortOrders updates sort_order for multiple photos in one query.
// Uses UPDATE ... FROM (VALUES ...) to avoid N round-trips.
func (r *ProductPhotoRepository) UpdateSortOrders(ctx context.Context, orders []PhotoSortOrder) error {
	if len(orders) == 0 {
		return nil
	}

	args := make([]any, 0, len(orders)*2)
	placeholders := make([]string, len(orders))
	for i, o := range orders {
		args = append(args, o.ID, o.SortOrder)
		placeholders[i] = "(?::int, ?::int)"
	}

	query := fmt.Sprintf(
		"UPDATE product_photos SET sort_order = v.sort_order"+
			" FROM (VALUES %s) AS v(id, sort_order)"+
			" WHERE product_photos.id = v.id AND product_photos.deleted_at IS NULL",
		strings.Join(placeholders, ", "),
	)

	return dbErr(r.db.WithContext(ctx).Exec(query, args...).Error)
}
