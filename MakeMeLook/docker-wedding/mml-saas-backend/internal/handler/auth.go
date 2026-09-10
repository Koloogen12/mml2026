package handler

import (
	"errors"
	"net/http"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"
)

const refreshCookieName = "refresh_token"
const refreshCookiePath = "/api/v1/auth"

type AuthHandler struct {
	service *service.AuthService
	cfg     *config.Config
}

func NewAuth(svc *service.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{service: svc, cfg: cfg}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	result, err := h.service.Register(r.Context(), req, r.RemoteAddr, r.UserAgent())
	if err != nil {
		h.handleError(w, err)
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	WriteJSON(w, http.StatusCreated, result.Response)
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req dto.VerifyEmailRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	result, err := h.service.VerifyEmail(r.Context(), req, r.RemoteAddr, r.UserAgent())
	if err != nil {
		h.handleError(w, err)
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	WriteJSON(w, http.StatusOK, result.Response)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	result, err := h.service.Login(r.Context(), req, r.RemoteAddr, r.UserAgent())
	if err != nil {
		h.handleError(w, err)
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	WriteJSON(w, http.StatusOK, result.Response)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	h.service.Logout(r.Context(), cookie.Value)
	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		WriteError(w, http.StatusUnauthorized, "no_session", "No refresh token")
		return
	}

	resp, err := h.service.Refresh(r.Context(), cookie.Value)
	if err != nil {
		h.handleError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req dto.ResendVerificationRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := h.service.ResendVerification(r.Context(), req); err != nil {
		h.handleError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, dto.MessageResponse{
		Message: "If the email needs verification, a new code has been sent",
	})
}

func (h *AuthHandler) PasswordReset(w http.ResponseWriter, r *http.Request) {
	var req dto.PasswordResetRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := h.service.PasswordReset(r.Context(), req); err != nil {
		h.handleError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, dto.MessageResponse{
		Message: "If an account with this email exists, a reset code has been sent",
	})
}

func (h *AuthHandler) PasswordResetVerify(w http.ResponseWriter, r *http.Request) {
	var req dto.PasswordResetVerifyRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := h.service.PasswordResetVerify(r.Context(), req); err != nil {
		h.handleError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, dto.MessageResponse{
		Message: "Code verified",
	})
}

func (h *AuthHandler) PasswordResetComplete(w http.ResponseWriter, r *http.Request) {
	var req dto.PasswordResetCompleteRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	result, err := h.service.PasswordResetComplete(r.Context(), req, r.RemoteAddr, r.UserAgent())
	if err != nil {
		h.handleError(w, err)
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	WriteJSON(w, http.StatusOK, result.Response)
}

// --- Cookie helpers ---

func (h *AuthHandler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     refreshCookiePath,
		MaxAge:   h.cfg.JWTRefreshExpDays * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   h.cfg.IsProduction(),
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     refreshCookiePath,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cfg.IsProduction(),
		SameSite: http.SameSiteLaxMode,
	})
}

// --- Error mapping ---

func (h *AuthHandler) handleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrEmailTaken):
		WriteError(w, http.StatusConflict, "email_taken", err.Error())
	case errors.Is(err, service.ErrInvalidCredentials):
		WriteError(w, http.StatusUnauthorized, "invalid_credentials", err.Error())
	case errors.Is(err, service.ErrAccountNotActive):
		WriteError(w, http.StatusForbidden, "account_not_active", err.Error())
	case errors.Is(err, service.ErrInvalidCode):
		WriteError(w, http.StatusBadRequest, "invalid_code", err.Error())
	case errors.Is(err, service.ErrRateLimited), errors.Is(err, service.ErrResendCooldown):
		WriteError(w, http.StatusTooManyRequests, "rate_limited", err.Error())
	case errors.Is(err, service.ErrWeakPassword):
		WriteError(w, http.StatusBadRequest, "weak_password", err.Error())
	case errors.Is(err, service.ErrSessionNotFound), errors.Is(err, service.ErrSessionExpired):
		WriteError(w, http.StatusUnauthorized, "session_invalid", err.Error())
	default:
		WriteError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
	}
}
