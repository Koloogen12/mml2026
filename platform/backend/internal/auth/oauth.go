package auth

// OAuth-вход через Google и Яндекс ID. Классический server-side
// authorization-code flow: /oauth/{provider}/start → провайдер → /callback.
// Почту, подтверждённую провайдером, отдаём в SignInWithEmail — тот же путь
// сессии, что и у входа по коду (никаких параллельных механизмов).
//
// CSRF: state кладём в короткоживущую httpOnly-куку и сверяем на callback.

import (
	"cmp"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const stateCookie = "mml_oauth_state"

// OAuthProvider — конфиг одного провайдера.
type OAuthProvider struct {
	ClientID     string
	ClientSecret string
	AuthURL      string
	TokenURL     string
	UserInfoURL  string
	Scope        string
}

// OAuthConfig — включённые провайдеры + база для redirect_uri.
// RedirectBase — публичный ORIGIN, на котором висит наш API: из него
// собирается redirect_uri для провайдера. Он обязан вести в бэкенд.
// FrontBase — куда вернуть ЧЕЛОВЕКА после входа. Это разные вещи: у нас API
// живёт в корне домена (/api/...), а витрина — под путём /app, потому что
// корень занят страницей вейтлиста.
type OAuthConfig struct {
	RedirectBase string
	FrontBase    string
	Providers    map[string]OAuthProvider
}

// NewOAuthConfig собирает провайдеров из ключей; пустые ключи → провайдер выключен.
func NewOAuthConfig(redirectBase, frontBase, googleID, googleSecret, yandexID, yandexSecret string) *OAuthConfig {
	c := &OAuthConfig{
		RedirectBase: strings.TrimRight(redirectBase, "/"),
		FrontBase:    strings.TrimRight(cmp.Or(frontBase, redirectBase), "/"),
		Providers:    map[string]OAuthProvider{},
	}
	if googleID != "" && googleSecret != "" {
		c.Providers["google"] = OAuthProvider{
			ClientID: googleID, ClientSecret: googleSecret,
			AuthURL:     "https://accounts.google.com/o/oauth2/v2/auth",
			TokenURL:    "https://oauth2.googleapis.com/token",
			UserInfoURL: "https://www.googleapis.com/oauth2/v3/userinfo",
			Scope:       "openid email profile",
		}
	}
	if yandexID != "" && yandexSecret != "" {
		c.Providers["yandex"] = OAuthProvider{
			ClientID: yandexID, ClientSecret: yandexSecret,
			AuthURL:     "https://oauth.yandex.ru/authorize",
			TokenURL:    "https://oauth.yandex.ru/token",
			UserInfoURL: "https://login.yandex.ru/info?format=json",
			Scope:       "login:email login:info",
		}
	}
	return c
}

func (c *OAuthConfig) redirectURI(provider string) string {
	return c.RedirectBase + "/api/v1/auth/oauth/" + provider + "/callback"
}

// Enabled — провайдер настроен?
func (c *OAuthConfig) Enabled(provider string) bool {
	_, ok := c.Providers[provider]
	return ok
}

func randomState() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// exchange меняет code на access_token провайдера.
func exchange(ctx context.Context, p OAuthProvider, code, redirectURI string) (string, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"client_id":     {p.ClientID},
		"client_secret": {p.ClientSecret},
		"redirect_uri":  {redirectURI},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.TokenURL,
		strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("обмен кода: статус %d", resp.StatusCode)
	}
	var out struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &out); err != nil || out.AccessToken == "" {
		return "", errors.New("провайдер не вернул access_token")
	}
	return out.AccessToken, nil
}

// fetchEmail тянет подтверждённую почту из userinfo провайдера.
func fetchEmail(ctx context.Context, p OAuthProvider, token string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.UserInfoURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("userinfo: статус %d", resp.StatusCode)
	}
	// Google: {"email":"..."}; Яндекс: {"default_email":"...","emails":[...]}
	var out struct {
		Email        string   `json:"email"`
		DefaultEmail string   `json:"default_email"`
		Emails       []string `json:"emails"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", errors.New("не разобрали userinfo")
	}
	switch {
	case out.Email != "":
		return out.Email, nil
	case out.DefaultEmail != "":
		return out.DefaultEmail, nil
	case len(out.Emails) > 0:
		return out.Emails[0], nil
	}
	return "", errors.New("провайдер не отдал почту")
}
