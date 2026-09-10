package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LeadTryOnRepository struct {
	db *gorm.DB
}

func newLeadTryOnRepository(db *gorm.DB) *LeadTryOnRepository {
	return &LeadTryOnRepository{db: db}
}

func (r *LeadTryOnRepository) Create(ctx context.Context, tryOn *model.LeadTryOn) error {
	return dbErr(r.db.WithContext(ctx).Create(tryOn).Error)
}

func (r *LeadTryOnRepository) Update(ctx context.Context, tryOn *model.LeadTryOn) error {
	return dbErr(r.db.WithContext(ctx).
		Omit("ModelPhoto", "OuterwearProduct", "TopsProduct", "BottomsProduct", "ShoesProduct", "AccessoriesProduct").
		Save(tryOn).Error)
}

func (r *LeadTryOnRepository) GetByID(ctx context.Context, id int64) (*model.LeadTryOn, error) {
	var tryOn model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("ModelPhoto").
		Preload("OuterwearProduct").
		Preload("OuterwearProduct.Photos").
		Preload("TopsProduct").
		Preload("TopsProduct.Photos").
		Preload("BottomsProduct").
		Preload("BottomsProduct.Photos").
		Preload("ShoesProduct").
		Preload("ShoesProduct.Photos").
		Preload("AccessoriesProduct").
		Preload("AccessoriesProduct.Photos").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&tryOn).Error
	return queryResult(&tryOn, err)
}

func (r *LeadTryOnRepository) GetByPublicID(ctx context.Context, publicID uuid.UUID) (*model.LeadTryOn, error) {
	var tryOn model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("OuterwearProduct").
		Preload("OuterwearProduct.Photos").
		Preload("TopsProduct").
		Preload("TopsProduct.Photos").
		Preload("BottomsProduct").
		Preload("BottomsProduct.Photos").
		Preload("ShoesProduct").
		Preload("ShoesProduct.Photos").
		Preload("AccessoriesProduct").
		Preload("AccessoriesProduct.Photos").
		Where("public_id = ? AND deleted_at IS NULL", publicID).
		First(&tryOn).Error
	return queryResult(&tryOn, err)
}

func (r *LeadTryOnRepository) ListByLeadID(ctx context.Context, leadID int64) ([]*model.LeadTryOn, error) {
	var tryOns []*model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("OuterwearProduct").
		Preload("OuterwearProduct.Photos").
		Preload("TopsProduct").
		Preload("TopsProduct.Photos").
		Preload("BottomsProduct").
		Preload("BottomsProduct.Photos").
		Preload("ShoesProduct").
		Preload("ShoesProduct.Photos").
		Preload("AccessoriesProduct").
		Preload("AccessoriesProduct.Photos").
		Where("lead_id = ? AND deleted_at IS NULL", leadID).
		Order("created_at DESC").
		Find(&tryOns).Error
	return tryOns, dbErr(err)
}

// GetLatestByLeadID returns the most recent try-on (done or processing) for a lead, or nil if none.
func (r *LeadTryOnRepository) GetLatestByLeadID(ctx context.Context, leadID int64) (*model.LeadTryOn, error) {
	var tryOn model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("OuterwearProduct").
		Preload("OuterwearProduct.Photos").
		Preload("TopsProduct").
		Preload("TopsProduct.Photos").
		Preload("BottomsProduct").
		Preload("BottomsProduct.Photos").
		Preload("ShoesProduct").
		Preload("ShoesProduct.Photos").
		Preload("AccessoriesProduct").
		Preload("AccessoriesProduct.Photos").
		Where("lead_id = ? AND status IN (?, ?) AND deleted_at IS NULL", leadID, model.TryOnStatusDone, model.TryOnStatusProcessing).
		Order("created_at DESC").
		First(&tryOn).Error
	return queryResult(&tryOn, err)
}

func (r *LeadTryOnRepository) MarkStuckAsError(ctx context.Context) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Where("status = ? AND deleted_at IS NULL", model.TryOnStatusProcessing).
		Update("status", model.TryOnStatusError).Error)
}

// FindCachedSuccess looks up the most-recent successful try-on for the
// same (lead, photo, exact garment combination) so a repeat click on the
// same product reuses the prior render instead of paying for another AI
// call. Slot IDs are matched in nullable fashion — a NULL slot in the
// request must match a NULL slot in the cached row (otherwise a top-only
// request would falsely match a top+bottoms render).
//
// Used by service.TryOn before creating a new try-on record. See the
// `useCacheIfFresh` block there for the full UX implications.
func (r *LeadTryOnRepository) FindCachedSuccess(
	ctx context.Context,
	leadID int64,
	modelPhotoID *int64,
	tops, bottoms, outerwear, shoes, accessories *int,
) (*model.LeadTryOn, error) {
	q := r.db.WithContext(ctx).
		Where("lead_id = ?", leadID).
		Where("status = ?", model.TryOnStatusDone).
		Where("result_key IS NOT NULL").
		Where("deleted_at IS NULL")

	// Photo slot — model_photo_id is the strongest cache key dimension.
	// A different photo always invalidates the cache (different body /
	// lighting / pose → different output).
	if modelPhotoID != nil {
		q = q.Where("model_photo_id = ?", *modelPhotoID)
	} else {
		q = q.Where("model_photo_id IS NULL")
	}

	// Each garment slot must match exactly — both presence and value.
	addSlot := func(col string, id *int) {
		if id != nil {
			q = q.Where(col+" = ?", *id)
		} else {
			q = q.Where(col + " IS NULL")
		}
	}
	addSlot("tops_product_id", tops)
	addSlot("bottoms_product_id", bottoms)
	addSlot("outerwear_product_id", outerwear)
	addSlot("shoes_product_id", shoes)
	addSlot("accessories_product_id", accessories)

	var tryOn model.LeadTryOn
	err := q.Order("created_at DESC").First(&tryOn).Error
	return queryResult(&tryOn, err)
}
