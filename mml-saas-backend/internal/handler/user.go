package handler

import (
	"errors"
	"net/http"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/validator"
)

type UserHandler struct {
	authService *service.AuthService
	userService *service.UserService
}

func NewUser(authSvc *service.AuthService, userSvc *service.UserService) *UserHandler {
	return &UserHandler{
		authService: authSvc,
		userService: userSvc,
	}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	resp, err := h.userService.GetProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			WriteError(w, http.StatusNotFound, "user_not_found", err.Error())
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// UpdateProfile handles PATCH /api/v1/users/me
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	// Parse profile fields
	req := dto.UpdateProfileRequest{
		Name:     r.FormValue("name"),
		LastName: strPtrFromForm(r, "last_name"),
		Phone:    strPtrFromForm(r, "phone"),
		Company:  strPtrFromForm(r, "company"),
		Website:  strPtrFromForm(r, "website"),
		Country:  strPtrFromForm(r, "country"),
		Timezone: strPtrFromForm(r, "timezone"),
	}

	// Validate profile fields
	if err := validator.Struct(req); err != nil {
		WriteError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Handle avatar upload (optional)
	avatar, avatarFilename, avatarSize, cleanup, err := parseFile(r, "avatar", false)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid avatar file")
		return
	}
	defer cleanup()

	resp, err := h.userService.UpdateProfile(r.Context(), userID, req, avatar, avatarFilename, avatarSize)
	if err != nil {
		if errors.Is(err, service.ErrUnsupportedFileType) {
			WriteError(w, http.StatusBadRequest, "invalid_file_type", err.Error())
			return
		}
		if errors.Is(err, service.ErrFileTooLarge) {
			WriteError(w, http.StatusBadRequest, "file_too_large", err.Error())
			return
		}
		if errors.Is(err, service.ErrUserNotFound) {
			WriteError(w, http.StatusNotFound, "user_not_found", err.Error())
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// ChangePassword handles POST /api/v1/users/me/password
func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	var req dto.ChangePasswordRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := h.userService.ChangePassword(r.Context(), userID, req); err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			WriteError(w, http.StatusUnauthorized, "invalid_credentials", "Current password is incorrect")
			return
		}
		if errors.Is(err, service.ErrWeakPassword) {
			WriteError(w, http.StatusBadRequest, "weak_password", err.Error())
			return
		}
		if errors.Is(err, service.ErrUserNotFound) {
			WriteError(w, http.StatusNotFound, "user_not_found", err.Error())
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, dto.MessageResponse{Message: "Password changed successfully"})
}

// DeleteAccount handles DELETE /api/v1/users/me
func (h *UserHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	if err := h.userService.DeleteAccount(r.Context(), userID); err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to delete account")
		return
	}

	WriteJSON(w, http.StatusOK, dto.MessageResponse{Message: "Account deleted"})
}
