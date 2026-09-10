package repository

import (
	"errors"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type WaitlistSignupRepository struct {
	db *gorm.DB
}

func newWaitlistSignupRepository(db *gorm.DB) *WaitlistSignupRepository {
	return &WaitlistSignupRepository{db: db}
}

// Upsert inserts the signup, or loads the existing row if the phone is already
// on the list. Returns created=false when the phone already existed.
func (r *WaitlistSignupRepository) Upsert(s *model.WaitlistSignup) (created bool, err error) {
	var existing model.WaitlistSignup
	err = r.db.Where("phone = ?", s.Phone).First(&existing).Error
	if err == nil {
		*s = existing
		return false, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}
	if err = r.db.Create(s).Error; err != nil {
		return false, err
	}
	return true, nil
}

// Position returns the 1-based rank of a signup (count of rows with id <= given id).
func (r *WaitlistSignupRepository) Position(id int64) (int64, error) {
	var n int64
	err := r.db.Model(&model.WaitlistSignup{}).Where("id <= ?", id).Count(&n).Error
	return n, err
}
