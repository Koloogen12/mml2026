package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func newUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	return dbErr(r.db.WithContext(ctx).Create(user).Error)
}

func (r *UserRepository) GetByID(ctx context.Context, id int) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&user).Error
	return queryResult(&user, err)
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("email = ? AND deleted_at IS NULL", email).First(&user).Error
	return queryResult(&user, err)
}

func (r *UserRepository) UpdateStatus(ctx context.Context, id int, status model.UserStatus) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ?", id).
		Update("status", status).Error)
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id int, passwordHash string) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ?", id).
		Update("password_hash", passwordHash).Error)
}

// UpdateProfileData contains fields that can be updated in user profile.
type UpdateProfileData struct {
	Name         string  `gorm:"column:name"`
	LastName     *string `gorm:"column:last_name"`
	Phone        *string `gorm:"column:phone"`
	Company      *string `gorm:"column:company"`
	Website      *string `gorm:"column:website"`
	Country      *string `gorm:"column:country"`
	Timezone     *string `gorm:"column:timezone"`
	AvatarBucket *string `gorm:"column:avatar_bucket"`
	AvatarKey    *string `gorm:"column:avatar_key"`
}

// UpdateProfile updates user profile fields with type safety.
func (r *UserRepository) UpdateProfile(ctx context.Context, userID int, data *UpdateProfileData) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ?", userID).
		Updates(data).Error)
}

// SoftDelete sets deleted_at timestamp on the user (GORM soft delete).
func (r *UserRepository) SoftDelete(ctx context.Context, userID int) error {
	return dbErr(r.db.WithContext(ctx).
		Where("id = ?", userID).
		Delete(&model.User{}).Error)
}
