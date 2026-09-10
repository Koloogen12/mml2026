package handler

import (
	"errors"
	"net/http"

	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/logger"
)

type WaitlistHandler struct {
	svc *service.WaitlistService
}

func NewWaitlist(svc *service.WaitlistService) *WaitlistHandler {
	return &WaitlistHandler{svc: svc}
}

type waitlistSignupRequest struct {
	Phone string `json:"phone"`
}

type waitlistSignupResponse struct {
	Position int64 `json:"position"`
}

// POST /api/v1/waitlist (public)
func (h *WaitlistHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req waitlistSignupRequest
	if err := decodeJSON(w, r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "invalid JSON body")
		return
	}
	pos, err := h.svc.Signup(req.Phone, r.RemoteAddr, r.UserAgent())
	if err != nil {
		if errors.Is(err, service.ErrInvalidPhone) {
			WriteError(w, http.StatusBadRequest, "invalid_phone", "invalid phone number")
			return
		}
		logger.Error("waitlist", "signup failed", "error", err)
		WriteError(w, http.StatusInternalServerError, "internal_error", "could not process signup")
		return
	}
	WriteJSON(w, http.StatusOK, waitlistSignupResponse{Position: pos})
}
