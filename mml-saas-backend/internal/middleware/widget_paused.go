package middleware

import (
	"context"
	"net/http"

	"mml-saas-backend/internal/handler"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// SessionPausedChecker resolves whether the project that owns a session token
// is currently paused. Implementations should return:
//   - paused=true,  err=nil  → the request must be rejected with 403
//   - paused=false, err=nil  → request continues
//   - paused=false, err=nil and "not found" semantics → also continue;
//     the downstream handler will return its own 404, we don't want to
//     leak existence info via different middleware error codes
//   - paused=false, err!=nil → infrastructure error → 500
type SessionPausedChecker func(ctx context.Context, token uuid.UUID) (paused bool, err error)

// WidgetSessionPausedGuard rejects every widget request whose session token
// belongs to a paused project. Apply this AFTER any token-format validation
// the handler does — invalid/missing tokens fall through and the handler
// returns its normal 4xx.
//
// This is the kill-switch counterpart to the explicit paused-check in
// LeadService.{CreateSession,GetSession}. It covers the rest of the
// /api/widget/v1/sessions/{token}/* surface (tryon, photos, favorites,
// cart, consent, …) so that an admin clicking "Приостановить" actually
// stops every Gemini call and DB write originating from the customer's
// site, not just the initial loader handshake.
func WidgetSessionPausedGuard(check SessionPausedChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := chi.URLParam(r, "token")
			if tokenStr == "" {
				// No token in the route — guard isn't applicable, pass through.
				// (Should not happen because we only mount this on /sessions/{token}/*.)
				next.ServeHTTP(w, r)
				return
			}

			token, err := uuid.Parse(tokenStr)
			if err != nil {
				// Malformed token. Let the handler produce its own 400 — we
				// don't want to mask the real error or leak that we even
				// looked up the project.
				next.ServeHTTP(w, r)
				return
			}

			paused, err := check(r.Context(), token)
			if err != nil {
				handler.WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to verify project status")
				return
			}
			if paused {
				// 403 with the same code we use elsewhere — loader.ts treats
				// 403 as silent-hide, and any in-flight client UI that
				// receives this will simply report "недоступно" (which is
				// what we want when an admin pulls the kill-switch).
				handler.WriteError(w, http.StatusForbidden, "project_paused", "Project is paused")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
