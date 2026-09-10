package repository

import (
	"errors"

	"mml-saas-backend/pkg/logger"

	"gorm.io/gorm"
)

// isNotFound returns true if the error is gorm.ErrRecordNotFound.
func isNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}

// dbErr logs unexpected database errors at the point of origin.
// Expected errors like ErrRecordNotFound are not logged.
func dbErr(err error) error {
	if err != nil && !isNotFound(err) {
		logger.Error("database", "query error", "error", err)
	}
	return err
}

// queryResult handles the common get-one pattern: not-found → nil,nil; error → nil,err; ok → val,nil.
func queryResult[T any](val *T, err error) (*T, error) {
	if isNotFound(err) {
		return nil, nil
	}
	if err != nil {
		return nil, dbErr(err)
	}
	return val, nil
}

// affectedRows returns the number of affected rows or an error.
// Used for Update/Delete operations that need ownership checks.
func affectedRows(result *gorm.DB) (int64, error) {
	if result.Error != nil {
		return 0, dbErr(result.Error)
	}
	return result.RowsAffected, nil
}

// Repositories aggregates all data access repositories.
type Repositories struct {
	db                *gorm.DB
	User              *UserRepository
	AuthSession       *AuthSessionRepository
	EmailVerification *EmailVerificationRepository
	PasswordReset     *PasswordResetRepository
	Project           *ProjectRepository
	ProjectDomain     *ProjectDomainRepository
	Product           *ProductRepository
	ProductPhoto      *ProductPhotoRepository
	ProductGroup      *ProductGroupRepository
	WidgetConfig      *WidgetConfigRepository
	DiagnosticResult  *DiagnosticResultRepository
	Avatar            *AvatarRepository
	Lead              *LeadRepository
	LeadPhoto         *LeadPhotoRepository
	LeadTryOn         *LeadTryOnRepository
	LeadFavorite      *LeadFavoriteRepository
	LeadCartItem      *LeadCartItemRepository
	WidgetEvent       *WidgetEventRepository
	AiApiLog          *AiApiLogRepository
	Analytics         *AnalyticsRepository
	EcommerceStore    *EcommerceStoreRepository
	StoreCategory    *StoreCategoryRepository
	CategoryMapping  *CategoryMappingRepository
	Storefront       *StorefrontRepository
}

func New(db *gorm.DB) *Repositories {
	return newRepos(db)
}

func newRepos(db *gorm.DB) *Repositories {
	return &Repositories{
		db:                db,
		User:              newUserRepository(db),
		AuthSession:       newAuthSessionRepository(db),
		EmailVerification: newEmailVerificationRepository(db),
		PasswordReset:     newPasswordResetRepository(db),
		Project:           newProjectRepository(db),
		ProjectDomain:     newProjectDomainRepository(db),
		Product:           newProductRepository(db),
		ProductPhoto:      newProductPhotoRepository(db),
		ProductGroup:      newProductGroupRepository(db),
		WidgetConfig:      newWidgetConfigRepository(db),
		DiagnosticResult:  newDiagnosticResultRepository(db),
		Avatar:            newAvatarRepository(db),
		Lead:              newLeadRepository(db),
		LeadPhoto:         newLeadPhotoRepository(db),
		LeadTryOn:         newLeadTryOnRepository(db),
		LeadFavorite:      newLeadFavoriteRepository(db),
		LeadCartItem:      newLeadCartItemRepository(db),
		WidgetEvent:       newWidgetEventRepository(db),
		AiApiLog:          newAiApiLogRepository(db),
		Analytics:         newAnalyticsRepository(db),
		EcommerceStore:    newEcommerceStoreRepository(db),
		StoreCategory:    newStoreCategoryRepository(db),
		CategoryMapping:  newCategoryMappingRepository(db),
		Storefront:       newStorefrontRepository(db),
	}
}

// Transaction executes fn inside a database transaction.
// The callback receives a Repositories instance backed by the transaction.
func (r *Repositories) Transaction(fn func(txRepos *Repositories) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fn(newRepos(tx))
	})
}
