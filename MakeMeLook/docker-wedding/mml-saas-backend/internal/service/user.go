package service

import (
	"context"
	"fmt"
	"io"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/hasher"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/validator"
)

const (
	maxAvatarSize = 5 * 1024 * 1024 // 5MB
	avatarBucket  = "user-avatars"
)

var allowedAvatarExts = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
}

type UserService struct {
	repos   *repository.Repositories
	cfg     *config.Config
	storage *StorageService
}

func NewUser(repos *repository.Repositories, cfg *config.Config, storage *StorageService) *UserService {
	return &UserService{
		repos:   repos,
		cfg:     cfg,
		storage: storage,
	}
}

// GetProfile returns user profile data.
func (s *UserService) GetProfile(ctx context.Context, userID int) (*dto.ProfileResponse, error) {
	user, err := s.repos.User.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	return s.userToProfileDTO(user), nil
}

// UpdateProfile updates user profile with optional avatar upload.
func (s *UserService) UpdateProfile(ctx context.Context, userID int, req dto.UpdateProfileRequest, avatar io.Reader, avatarFilename string, avatarSize int64) (*dto.ProfileResponse, error) {
	user, err := s.repos.User.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	// Prepare update data with type safety
	data := &repository.UpdateProfileData{
		Name:     req.Name,
		LastName: req.LastName,
		Phone:    req.Phone,
		Company:  req.Company,
		Website:  req.Website,
		Country:  req.Country,
		Timezone: req.Timezone,
	}

	// Handle avatar upload if provided
	if avatar != nil {
		key, err := s.storage.UploadImage(ctx, avatarBucket, avatar, avatarFilename, avatarSize, maxAvatarSize, allowedAvatarExts)
		if err != nil {
			return nil, err
		}
		bucket := avatarBucket
		data.AvatarBucket = &bucket
		data.AvatarKey = &key
	}

	if err := s.repos.User.UpdateProfile(ctx, userID, data); err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}

	// Fetch updated user
	user, err = s.repos.User.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get updated user: %w", err)
	}

	return s.userToProfileDTO(user), nil
}

// ChangePassword verifies current password and updates to new password.
func (s *UserService) ChangePassword(ctx context.Context, userID int, req dto.ChangePasswordRequest) error {
	if !validator.Password(req.NewPassword) {
		return ErrWeakPassword
	}

	user, err := s.repos.User.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}

	if !hasher.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		return ErrInvalidCredentials
	}

	hash, err := hasher.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	if err := s.repos.User.UpdatePassword(ctx, userID, hash); err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	return nil
}

// DeleteAccount soft-deletes the user account and all associated data.
func (s *UserService) DeleteAccount(ctx context.Context, userID int) error {
	user, err := s.repos.User.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}

	if err := s.repos.User.SoftDelete(ctx, userID); err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}

	logger.Info("user", "account deleted", "user_id", userID, "email", user.Email)
	return nil
}

// userToProfileDTO converts User model to ProfileResponse DTO, generating avatar URL from bucket+key.
func (s *UserService) userToProfileDTO(user *model.User) *dto.ProfileResponse {
	var avatarURL *string
	if user.AvatarBucket != nil && user.AvatarKey != nil {
		url := s.storage.GetObjectURL(*user.AvatarBucket, *user.AvatarKey)
		avatarURL = &url
	}

	return &dto.ProfileResponse{
		ID:                   user.ID,
		Email:                user.Email,
		Name:                 user.Name,
		LastName:             user.LastName,
		Phone:                user.Phone,
		Company:              user.Company,
		Website:              user.Website,
		Country:              user.Country,
		Timezone:             user.Timezone,
		AvatarURL:            avatarURL,
		Status:               string(user.Status),
		VerificationCooldown: 0, // Not applicable for profile view
	}
}
