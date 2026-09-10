package handler

import (
	"fmt"
	"html/template"
	"net/http"

	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/logger"
)

type WidgetOAuthHandler struct {
	oauthSvc *service.OAuthService
}

func NewWidgetOAuth(oauthSvc *service.OAuthService) *WidgetOAuthHandler {
	return &WidgetOAuthHandler{oauthSvc: oauthSvc}
}

// GoogleRedirect initiates Google OAuth flow.
// GET /api/v1/widget/auth/google?session={token}
func (h *WidgetOAuthHandler) GoogleRedirect(w http.ResponseWriter, r *http.Request) {
	session := r.URL.Query().Get("session")
	if session == "" {
		WriteError(w, http.StatusBadRequest, "missing_session", "session query parameter required")
		return
	}
	authURL := h.oauthSvc.GoogleAuthURL(session)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// GoogleCallback handles the OAuth callback from Google.
// GET /api/v1/widget/auth/google/callback?code=...&state={session}
func (h *WidgetOAuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state") // session token
	errParam := r.URL.Query().Get("error")

	if errParam != "" {
		logger.Warn("oauth", "Google OAuth denied", "error", errParam)
		writeCallbackHTML(w, "", "", errParam)
		return
	}

	if code == "" || state == "" {
		writeCallbackHTML(w, "", "", "missing_code_or_state")
		return
	}

	userInfo, err := h.oauthSvc.ExchangeGoogleCode(r.Context(), code)
	if err != nil {
		logger.Error("oauth", "Google code exchange failed", "error", err)
		writeCallbackHTML(w, "", "", "exchange_failed")
		return
	}

	lead, err := h.oauthSvc.AuthenticateLeadByOAuth(r.Context(), state, userInfo.Email, "google")
	if err != nil {
		logger.Error("oauth", "Lead auth failed", "error", err)
		writeCallbackHTML(w, "", "", "auth_failed")
		return
	}

	_ = lead
	writeCallbackHTML(w, userInfo.Email, "google", "")
}

// YandexRedirect initiates Yandex OAuth flow.
// GET /api/v1/widget/auth/yandex?session={token}
func (h *WidgetOAuthHandler) YandexRedirect(w http.ResponseWriter, r *http.Request) {
	session := r.URL.Query().Get("session")
	if session == "" {
		WriteError(w, http.StatusBadRequest, "missing_session", "session query parameter required")
		return
	}
	authURL := h.oauthSvc.YandexAuthURL(session)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// YandexCallback handles the OAuth callback from Yandex.
// GET /api/v1/widget/auth/yandex/callback?code=...&state={session}
func (h *WidgetOAuthHandler) YandexCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	errParam := r.URL.Query().Get("error")

	if errParam != "" {
		logger.Warn("oauth", "Yandex OAuth denied", "error", errParam)
		writeCallbackHTML(w, "", "", errParam)
		return
	}

	if code == "" || state == "" {
		writeCallbackHTML(w, "", "", "missing_code_or_state")
		return
	}

	userInfo, err := h.oauthSvc.ExchangeYandexCode(r.Context(), code)
	if err != nil {
		logger.Error("oauth", "Yandex code exchange failed", "error", err)
		writeCallbackHTML(w, "", "", "exchange_failed")
		return
	}

	lead, err := h.oauthSvc.AuthenticateLeadByOAuth(r.Context(), state, userInfo.DefaultEmail, "yandex")
	if err != nil {
		logger.Error("oauth", "Lead auth failed", "error", err)
		writeCallbackHTML(w, "", "", "auth_failed")
		return
	}

	_ = lead
	writeCallbackHTML(w, userInfo.DefaultEmail, "yandex", "")
}


// writeCallbackHTML renders a minimal HTML page that sends result to opener via postMessage.
func writeCallbackHTML(w http.ResponseWriter, email, provider, errMsg string) {
	status := "success"
	if errMsg != "" {
		status = "error"
	}

	// Escape user-controlled values to prevent XSS
	safeEmail := template.JSEscapeString(email)
	safeProvider := template.JSEscapeString(provider)
	safeErr := template.JSEscapeString(errMsg)

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><title>MakeMeLook Auth</title></head>
<body>
<script>
(function() {
  var result = {
    type: "mml-oauth-result",
    status: "%s",
    email: "%s",
    provider: "%s",
    error: "%s"
  };
  if (window.opener) {
    window.opener.postMessage(result, "*");
  }
  window.close();
})();
</script>
<p>Авторизация завершена. Это окно закроется автоматически.</p>
</body>
</html>`, status, safeEmail, safeProvider, safeErr)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, html)
}
