package handler

import (
	"errors"
	"net/http"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/mailer"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type WidgetAuthHandler struct {
	leadSvc *service.LeadService
	mailer  *mailer.Mailer
}

func NewWidgetAuth(leadSvc *service.LeadService, mailer *mailer.Mailer) *WidgetAuthHandler {
	return &WidgetAuthHandler{leadSvc: leadSvc, mailer: mailer}
}

// SendCode handles POST /api/widget/v1/sessions/{token}/auth/send-code
func (h *WidgetAuthHandler) SendCode(w http.ResponseWriter, r *http.Request) {
	token, err := uuid.Parse(chi.URLParam(r, "token"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_token", "Invalid session token")
		return
	}

	var req dto.WidgetSendCodeRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.leadSvc.SendAuthCode(r.Context(), token, &req, h.mailer)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSessionNotFound):
			WriteError(w, http.StatusNotFound, "session_not_found", "Session not found")
		case errors.Is(err, service.ErrCodeCooldown):
			WriteError(w, http.StatusTooManyRequests, "cooldown", "Code was sent recently, please wait")
		case errors.Is(err, service.ErrInvalidContact):
			WriteError(w, http.StatusBadRequest, "invalid_contact", "Invalid phone or email")
		default:
			WriteError(w, http.StatusInternalServerError, "internal", "Failed to send code")
		}
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// VerifyCode handles POST /api/widget/v1/sessions/{token}/auth/verify
func (h *WidgetAuthHandler) VerifyCode(w http.ResponseWriter, r *http.Request) {
	token, err := uuid.Parse(chi.URLParam(r, "token"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_token", "Invalid session token")
		return
	}

	var req dto.WidgetVerifyCodeRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.leadSvc.VerifyAuthCode(r.Context(), token, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSessionNotFound):
			WriteError(w, http.StatusNotFound, "session_not_found", "Session not found")
		case errors.Is(err, service.ErrLeadInvalidCode):
			WriteError(w, http.StatusBadRequest, "invalid_code", "Invalid or expired code")
		default:
			WriteError(w, http.StatusInternalServerError, "internal", "Failed to verify code")
		}
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
