package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"time"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	up     Uploader // может быть nil
	svc    *Service
	oauth  *OAuthConfig
	secure bool // Secure-флаг на refresh-cookie (true в проде)
}

// WithUploader подключает хранилище для аватара. Опционально: без него ручка
// честно отвечает 501, а не делает вид, что сохранила.
func (h *Handler) WithUploader(up Uploader) *Handler { h.up = up; return h }

func NewHandler(svc *Service, secure bool, oauth *OAuthConfig) *Handler {
	return &Handler{svc: svc, secure: secure, oauth: oauth}
}

const refreshCookie = "mml_refresh"

func (h *Handler) RequestCode(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Email == "" {
		writeErr(w, http.StatusBadRequest, "нужен email")
		return
	}
	if err := h.svc.RequestCode(r.Context(), body.Email, false); err != nil {
		if errors.Is(err, ErrCooldown) {
			writeErr(w, http.StatusTooManyRequests, err.Error())
			return
		}
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]bool{"sent": true})
}

func (h *Handler) Verify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Email == "" || body.Code == "" {
		writeErr(w, http.StatusBadRequest, "нужны email и код")
		return
	}
	res, err := h.svc.VerifyCode(r.Context(), body.Email, body.Code, r.UserAgent())
	if err != nil {
		if errors.Is(err, ErrTooMany) {
			writeErr(w, http.StatusTooManyRequests, err.Error())
			return
		}
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	h.setRefreshCookie(w, res.RefreshToken)
	writeJSON(w, map[string]any{
		"access_token": res.AccessToken,
		"user":         map[string]any{"id": res.UserPublicID, "email": res.Email},
		"is_new":       res.IsNew,
	})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(refreshCookie)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "нет сессии")
		return
	}
	access, err := h.svc.Refresh(r.Context(), c.Value)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "сессия истекла")
		return
	}
	writeJSON(w, map[string]string{"access_token": access})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(refreshCookie); err == nil {
		_ = h.svc.Logout(r.Context(), c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name: refreshCookie, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, map[string]bool{"ok": true})
}

// OAuthStart — GET /api/v1/auth/oauth/{provider}/start.
// Ставит state-куку (CSRF) и уводит на провайдера.
func (h *Handler) OAuthStart(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	if h.oauth == nil || !h.oauth.Enabled(provider) {
		writeErr(w, http.StatusNotImplemented, "вход через этого провайдера не настроен")
		return
	}
	p := h.oauth.Providers[provider]
	state := randomState()
	http.SetCookie(w, &http.Cookie{
		Name: stateCookie, Value: provider + ":" + state, Path: "/",
		Expires: time.Now().Add(10 * time.Minute), HttpOnly: true,
		Secure: h.secure, SameSite: http.SameSiteLaxMode,
	})
	q := url.Values{
		"response_type": {"code"},
		"client_id":     {p.ClientID},
		"redirect_uri":  {h.oauth.redirectURI(provider)},
		"scope":         {p.Scope},
		"state":         {state},
	}
	http.Redirect(w, r, p.AuthURL+"?"+q.Encode(), http.StatusFound)
}

// OAuthCallback — GET /api/v1/auth/oauth/{provider}/callback?code&state.
// Сверяет state, меняет code на токен, берёт подтверждённую почту, заводит
// сессию тем же путём, что и вход по коду, и возвращает человека в приложение.
func (h *Handler) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	if h.oauth == nil || !h.oauth.Enabled(provider) {
		writeErr(w, http.StatusNotImplemented, "вход через этого провайдера не настроен")
		return
	}
	fail := func(reason string) {
		// Не показываем сырую ошибку в URL — только флаг для приложения.
		http.Redirect(w, r, h.oauth.FrontBase+"/?auth_error="+url.QueryEscape(reason), http.StatusFound)
	}

	c, err := r.Cookie(stateCookie)
	if err != nil || c.Value != provider+":"+r.URL.Query().Get("state") || r.URL.Query().Get("state") == "" {
		fail("state")
		return
	}
	// state одноразовый — гасим сразу
	http.SetCookie(w, &http.Cookie{Name: stateCookie, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})

	code := r.URL.Query().Get("code")
	if code == "" {
		fail("denied")
		return
	}
	p := h.oauth.Providers[provider]
	tok, err := exchange(r.Context(), p, code, h.oauth.redirectURI(provider))
	if err != nil {
		fail("exchange")
		return
	}
	email, err := fetchEmail(r.Context(), p, tok)
	if err != nil {
		fail("email")
		return
	}
	res, err := h.svc.SignInWithEmail(r.Context(), email, r.UserAgent())
	if err != nil {
		fail("signin")
		return
	}
	h.setRefreshCookie(w, res.RefreshToken)
	// Access-токен приложение получит обычным refresh-ом на старте.
	http.Redirect(w, r, h.oauth.FrontBase+"/?auth=ok", http.StatusFound)
}

// Me — кто вошёл (для гидратации фронта).
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	c := UserFrom(r.Context())
	if c == nil {
		writeErr(w, http.StatusUnauthorized, "не авторизован")
		return
	}
	name, avatar := h.svc.Profile(r.Context(), c.UserPublicID)
	writeJSON(w, map[string]any{
		"id":           c.UserPublicID,
		"display_name": name,
		"avatar_url":   avatar,
	})
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookie,
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(refreshTTL),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
