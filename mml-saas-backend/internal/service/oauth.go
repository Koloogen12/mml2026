package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
)

type OAuthService struct {
	repos  *repository.Repositories
	cfg    *config.Config
	client *http.Client
}

func NewOAuth(repos *repository.Repositories, cfg *config.Config) *OAuthService {
	return &OAuthService{
		repos:  repos,
		cfg:    cfg,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// --- Google OAuth ---

func (s *OAuthService) GoogleAuthURL(sessionToken string) string {
	params := url.Values{
		"client_id":     {s.cfg.GoogleOAuthClientID},
		"redirect_uri":  {s.googleRedirectURI()},
		"response_type": {"code"},
		"scope":         {"openid email profile"},
		"state":         {sessionToken},
		"prompt":        {"select_account"},
	}
	return "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()
}

func (s *OAuthService) googleRedirectURI() string {
	return s.cfg.OAuthBaseURL + "/api/v1/widget/auth/google/callback"
}

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

type googleUserInfo struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func (s *OAuthService) ExchangeGoogleCode(ctx context.Context, code string) (*googleUserInfo, error) {
	// Exchange code for tokens
	data := url.Values{
		"code":          {code},
		"client_id":     {s.cfg.GoogleOAuthClientID},
		"client_secret": {s.cfg.GoogleOAuthClientSecret},
		"redirect_uri":  {s.googleRedirectURI()},
		"grant_type":    {"authorization_code"},
	}

	resp, err := s.client.PostForm("https://oauth2.googleapis.com/token", data)
	if err != nil {
		return nil, fmt.Errorf("google token exchange: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google token exchange failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokenResp googleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("decode google token: %w", err)
	}

	// Get user info
	req, _ := http.NewRequestWithContext(ctx, "GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	infoResp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google userinfo: %w", err)
	}
	defer infoResp.Body.Close()

	var userInfo googleUserInfo
	if err := json.NewDecoder(infoResp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("decode google userinfo: %w", err)
	}

	return &userInfo, nil
}

// --- Yandex OAuth ---

func (s *OAuthService) YandexAuthURL(sessionToken string) string {
	params := url.Values{
		"client_id":     {s.cfg.YandexOAuthClientID},
		"redirect_uri":  {s.yandexRedirectURI()},
		"response_type": {"code"},
		"state":         {sessionToken},
		"force_confirm": {"yes"},
	}
	return "https://oauth.yandex.ru/authorize?" + params.Encode()
}

func (s *OAuthService) yandexRedirectURI() string {
	return s.cfg.OAuthBaseURL + "/api/v1/widget/auth/yandex/callback"
}

type yandexTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type yandexUserInfo struct {
	DefaultEmail string `json:"default_email"`
	DisplayName  string `json:"display_name"`
	RealName     string `json:"real_name"`
}

func (s *OAuthService) ExchangeYandexCode(ctx context.Context, code string) (*yandexUserInfo, error) {
	// Exchange code for tokens
	data := url.Values{
		"code":       {code},
		"grant_type": {"authorization_code"},
	}

	req, _ := http.NewRequestWithContext(ctx, "POST", "https://oauth.yandex.ru/token", strings.NewReader(data.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(s.cfg.YandexOAuthClientID, s.cfg.YandexOAuthClientSecret)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("yandex token exchange: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("yandex token exchange failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokenResp yandexTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("decode yandex token: %w", err)
	}

	// Get user info
	infoReq, _ := http.NewRequestWithContext(ctx, "GET", "https://login.yandex.ru/info?format=json", nil)
	infoReq.Header.Set("Authorization", "OAuth "+tokenResp.AccessToken)

	infoResp, err := s.client.Do(infoReq)
	if err != nil {
		return nil, fmt.Errorf("yandex userinfo: %w", err)
	}
	defer infoResp.Body.Close()

	var userInfo yandexUserInfo
	if err := json.NewDecoder(infoResp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("decode yandex userinfo: %w", err)
	}

	return &userInfo, nil
}

// --- Common: authenticate lead after OAuth ---

func (s *OAuthService) AuthenticateLeadByOAuth(ctx context.Context, sessionToken string, email string, provider string) (*model.Lead, error) {
	token, err := uuid.Parse(sessionToken)
	if err != nil {
		return nil, fmt.Errorf("invalid session token: %w", err)
	}

	lead, err := s.repos.Lead.GetBySessionToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("lead not found: %w", err)
	}
	if lead == nil {
		return nil, ErrSessionNotFound
	}

	lead.Email = &email
	lead.IsAuthenticated = true
	lead.AuthProvider = &provider
	lead.AuthCode = nil
	lead.AuthCodeExpiresAt = nil

	if err := s.repos.Lead.Update(ctx, lead); err != nil {
		return nil, fmt.Errorf("update lead oauth: %w", err)
	}

	logger.Info("oauth", "lead authenticated via OAuth",
		"session", sessionToken, "provider", provider, "email", email)

	return lead, nil
}
