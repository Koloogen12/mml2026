package handler

import (
	"errors"
	"fmt"
	"html"
	"net/http"
	"strconv"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type WidgetSessionHandler struct {
	leadSvc    *service.LeadService
	tryOnSvc   *service.TryOnService
	avatarSvc  *service.AvatarService
	favSvc     *service.FavoriteService
	cartSvc    *service.CartService
	eventSvc   *service.WidgetEventService
	productSvc *service.ProductService
	storageSvc *service.StorageService
	bucket     string
}

func NewWidgetSession(
	leadSvc *service.LeadService,
	tryOnSvc *service.TryOnService,
	avatarSvc *service.AvatarService,
	favSvc *service.FavoriteService,
	cartSvc *service.CartService,
	eventSvc *service.WidgetEventService,
	productSvc *service.ProductService,
	storageSvc *service.StorageService,
	bucket string,
) *WidgetSessionHandler {
	return &WidgetSessionHandler{
		leadSvc:    leadSvc,
		tryOnSvc:   tryOnSvc,
		avatarSvc:  avatarSvc,
		favSvc:     favSvc,
		cartSvc:    cartSvc,
		eventSvc:   eventSvc,
		productSvc: productSvc,
		storageSvc: storageSvc,
		bucket:     bucket,
	}
}

// --- Sessions ---

// CreateSession handles POST /api/widget/v1/sessions
func (h *WidgetSessionHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateSessionRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	req.IP = r.RemoteAddr
	req.UserAgent = r.UserAgent()
	req.Origin = r.Header.Get("Origin")
	if req.Origin == "" {
		req.Origin = r.Header.Get("Referer")
	}

	resp, err := h.leadSvc.CreateSession(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			WriteError(w, http.StatusNotFound, "not_found", "Project not found")
		case errors.Is(err, service.ErrDomainNotAllowed):
			WriteError(w, http.StatusForbidden, "domain_not_allowed", "This domain is not authorized to use this widget")
		default:
			WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to create session")
		}
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// GetSession handles GET /api/widget/v1/sessions/{token}
// Returns session data + widget config so the loader needs only one request on page reload.
func (h *WidgetSessionHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	resp, err := h.leadSvc.GetSession(r.Context(), token)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSessionNotFound):
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
		case errors.Is(err, service.ErrWidgetConfigNotFound):
			WriteError(w, http.StatusNotFound, "not_found", "Widget not configured")
		default:
			WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		}
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// UpdateSession handles PUT /api/widget/v1/sessions/{token}
func (h *WidgetSessionHandler) UpdateSession(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	var req dto.UpdateSessionRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.leadSvc.UpdateSession(r.Context(), token, &req)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to update session")
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// DeleteSession handles DELETE /api/widget/v1/sessions/{token}
func (h *WidgetSessionHandler) DeleteSession(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	if err := h.leadSvc.DeleteSession(r.Context(), token); err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to delete session")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Photos ---

// UploadPhoto handles POST /api/widget/v1/sessions/{token}/photos
func (h *WidgetSessionHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	file, filename, size, cleanup, err := parseFile(r, "photo", true)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	defer cleanup()

	allowedExts := map[string]string{
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".webp": "image/webp",
	}

	objectKey, err := h.storageSvc.UploadImage(r.Context(), h.bucket, file, filename, size, 10*1024*1024, allowedExts)
	if err != nil {
		if errors.Is(err, service.ErrFileTooLarge) {
			WriteError(w, http.StatusBadRequest, "file_too_large", "Photo must be under 10MB")
			return
		}
		if errors.Is(err, service.ErrUnsupportedFileType) {
			WriteError(w, http.StatusBadRequest, "invalid_file_type", "Supported: JPG, PNG, WebP")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to upload photo")
		return
	}

	photo := &service.LeadPhotoCreate{
		LeadID:    lead.ID,
		ObjectKey: objectKey,
		Type:      "model_photo",
	}

	resp, err := h.leadSvc.CreatePhoto(r.Context(), photo)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to save photo")
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// --- Try-on ---

// TryOn handles POST /api/widget/v1/sessions/{token}/tryon
func (h *WidgetSessionHandler) TryOn(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	var req dto.TryOnRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.tryOnSvc.TryOn(r.Context(), lead, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrNoGarments):
			WriteError(w, http.StatusBadRequest, "invalid_request", "At least one product is required")
		case errors.Is(err, service.ErrTooManyGarments):
			WriteError(w, http.StatusBadRequest, "invalid_request", "Maximum 3 products allowed")
		case errors.Is(err, service.ErrModelPhotoNotFound):
			WriteError(w, http.StatusBadRequest, "invalid_request", "Model photo not found")
		case errors.Is(err, service.ErrMonthlyLimitExceeded):
			WriteError(w, http.StatusTooManyRequests, "limit_exceeded", "Monthly try-on limit exceeded")
		default:
			WriteError(w, http.StatusInternalServerError, "internal_error", "Try-on generation failed")
		}
		return
	}

	WriteJSON(w, http.StatusAccepted, resp)
}

// TryOnStatus handles GET /api/widget/v1/sessions/{token}/tryon/{tryOnId}/status
func (h *WidgetSessionHandler) TryOnStatus(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	tryOnID := chi.URLParam(r, "tryOnId")
	resp, err := h.tryOnSvc.GetTryOnStatus(r.Context(), lead, tryOnID)
	if err != nil {
		if errors.Is(err, service.ErrTryOnNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Try-on not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get try-on status")
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// TryOnHistory handles GET /api/widget/v1/sessions/{token}/tryon-history
func (h *WidgetSessionHandler) TryOnHistory(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	items, err := h.tryOnSvc.GetHistory(r.Context(), lead.ID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get try-on history")
		return
	}

	WriteJSON(w, http.StatusOK, items)
}

// --- Avatars ---

// ListAvatars handles GET /api/widget/v1/avatars
func (h *WidgetSessionHandler) ListAvatars(w http.ResponseWriter, r *http.Request) {
	gender := r.URL.Query().Get("gender")

	avatars, err := h.avatarSvc.List(r.Context(), gender)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to list avatars")
		return
	}

	WriteJSON(w, http.StatusOK, avatars)
}

// MatchAvatars handles GET /api/widget/v1/avatars/match
func (h *WidgetSessionHandler) MatchAvatars(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	gender := q.Get("gender")
	if gender == "" {
		WriteError(w, http.StatusBadRequest, "invalid_request", "gender is required")
		return
	}

	height, _ := strconv.Atoi(q.Get("height"))
	weight, _ := strconv.Atoi(q.Get("weight"))
	figureType := q.Get("figure_type")

	avatars, err := h.avatarSvc.Match(r.Context(), gender, height, weight, figureType)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to match avatars")
		return
	}

	WriteJSON(w, http.StatusOK, avatars)
}

// --- Favorites ---

// AddFavorite handles POST /api/widget/v1/sessions/{token}/favorites
func (h *WidgetSessionHandler) AddFavorite(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	var req dto.AddFavoriteRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.favSvc.Add(r.Context(), lead.ID, &req)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to add favorite")
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// ListFavorites handles GET /api/widget/v1/sessions/{token}/favorites
func (h *WidgetSessionHandler) ListFavorites(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	favs, err := h.favSvc.List(r.Context(), lead.ID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to list favorites")
		return
	}

	WriteJSON(w, http.StatusOK, favs)
}

// DeleteFavorite handles DELETE /api/widget/v1/sessions/{token}/favorites/{id}
func (h *WidgetSessionHandler) DeleteFavorite(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	favID := chi.URLParam(r, "id")
	if err := h.favSvc.Delete(r.Context(), favID, lead.ID); err != nil {
		WriteError(w, http.StatusNotFound, "not_found", "Favorite not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Cart ---

// AddCartItem handles POST /api/widget/v1/sessions/{token}/cart
func (h *WidgetSessionHandler) AddCartItem(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	var req dto.AddCartItemRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.cartSvc.Add(r.Context(), lead.ID, &req)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to add to cart")
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// ListCartItems handles GET /api/widget/v1/sessions/{token}/cart
func (h *WidgetSessionHandler) ListCartItems(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	items, err := h.cartSvc.List(r.Context(), lead.ID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to list cart")
		return
	}

	WriteJSON(w, http.StatusOK, items)
}

// DeleteCartItem handles DELETE /api/widget/v1/sessions/{token}/cart/{id}
func (h *WidgetSessionHandler) DeleteCartItem(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	itemID := chi.URLParam(r, "id")
	if err := h.cartSvc.Delete(r.Context(), itemID, lead.ID); err != nil {
		WriteError(w, http.StatusNotFound, "not_found", "Cart item not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Events ---

// TrackEvents handles POST /api/widget/v1/events
func (h *WidgetSessionHandler) TrackEvents(w http.ResponseWriter, r *http.Request) {
	var req dto.WidgetEventRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := h.eventSvc.TrackEvents(r.Context(), &req, r.RemoteAddr, r.UserAgent()); err != nil {
		if errors.Is(err, service.ErrProjectNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Project not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to track events")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Product Sync (auto-import from platform) ---

// SyncProducts handles POST /api/widget/v1/sessions/{token}/products/sync
func (h *WidgetSessionHandler) SyncProducts(w http.ResponseWriter, r *http.Request) {
	token, ok := h.parseSessionToken(w, r)
	if !ok {
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Session not found")
			return
		}
		WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to get session")
		return
	}

	var req dto.SyncProductsRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if len(req.Products) == 0 {
		WriteError(w, http.StatusBadRequest, "invalid_request", "No products to sync")
		return
	}

	resp, err := h.productSvc.SyncProductsFromWidget(r.Context(), lead.ProjectID, req)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", fmt.Sprintf("Sync failed: %v", err))
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// --- Helpers ---

func (h *WidgetSessionHandler) parseSessionToken(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	tokenStr := chi.URLParam(r, "token")
	token, err := uuid.Parse(tokenStr)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid session token")
		return uuid.Nil, false
	}
	return token, true
}

// ShareView handles GET /api/widget/v1/share/{tryOnPublicId} — public, no auth.
// Returns an HTML page with OG meta tags for social media previews.
func (h *WidgetSessionHandler) ShareView(w http.ResponseWriter, r *http.Request) {
	tryOnPublicID := chi.URLParam(r, "tryOnPublicId")
	if tryOnPublicID == "" {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Missing try-on ID")
		return
	}

	resp, err := h.tryOnSvc.GetPublicTryOn(r.Context(), tryOnPublicID)
	if err != nil {
		if errors.Is(err, service.ErrTryOnNotFound) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, shareNotFoundHTML)
		} else {
			WriteError(w, http.StatusInternalServerError, "internal", "Failed to get shared result")
		}
		return
	}

	// If client wants JSON (API call from widget), return JSON
	accept := r.Header.Get("Accept")
	if accept == "application/json" {
		WriteJSON(w, http.StatusOK, resp)
		return
	}

	// Otherwise render HTML share page
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	renderShareHTML(w, resp)
}

const shareNotFoundHTML = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>MakeMeLook</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f8f8;color:#1a1a1a}
.c{text-align:center;padding:40px}.logo{font-size:24px;font-weight:700;margin-bottom:16px}</style>
</head><body><div class="c"><div class="logo">MakeMeLook</div><p>Результат примерки не найден или был удалён.</p></div></body></html>`

func renderShareHTML(w http.ResponseWriter, data *dto.ShareViewResponse) {
	storeName := html.EscapeString(data.ProjectName)
	if storeName == "" {
		storeName = "MakeMeLook"
	}
	siteURL := html.EscapeString(data.SiteURL)
	if siteURL == "" {
		siteURL = "https://makemeelook.ai"
	}
	resultURL := html.EscapeString(data.ResultURL)

	// Product list
	productListHTML := ""
	for _, p := range data.Products {
		productListHTML += fmt.Sprintf(`<div class="product"><span class="product-name">%s</span><span class="product-cat">%s</span></div>`, html.EscapeString(p.Name), html.EscapeString(p.Category))
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Виртуальная примерка — %s | MakeMeLook</title>

<!-- OG Meta -->
<meta property="og:type" content="website">
<meta property="og:title" content="Посмотри мой образ — %s">
<meta property="og:description" content="Примерила одежду виртуально с помощью AI-стилиста MakeMeLook">
<meta property="og:image" content="%s">
<meta property="og:image:width" content="600">
<meta property="og:image:height" content="800">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Посмотри мой образ — %s">
<meta name="twitter:image" content="%s">

<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;background:#f5f5f5;color:#1a1a1a;min-height:100vh;display:flex;flex-direction:column;align-items:center}
.header{width:100%%;max-width:480px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;text-decoration:none}
.logo svg{height:22px;width:auto}
.store{font-size:13px;color:#888;font-weight:500}
.card{width:100%%;max-width:480px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);margin:0 16px}
.result-img{width:100%%;aspect-ratio:3/4;object-fit:cover;display:block}
.info{padding:24px}
.info h2{font-size:18px;font-weight:600;margin-bottom:16px;letter-spacing:-0.3px}
.product{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0}
.product:last-child{border-bottom:none}
.product-name{font-size:14px;font-weight:500}
.product-cat{font-size:12px;color:#888;text-transform:capitalize}
.cta{display:block;width:calc(100%% - 48px);max-width:432px;margin:24px auto;padding:16px;background:#1a1a1a;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer;letter-spacing:-0.2px;transition:opacity 0.2s}
.cta:hover{opacity:0.85}
.footer{padding:24px;text-align:center;font-size:12px;color:#aaa;margin-top:auto}
.footer a{color:#888;text-decoration:none}
</style>
</head>
<body>

<div class="header">
  <a href="https://makemeelook.ai" class="logo" target="_blank">
    <svg width="261" height="44" viewBox="0 0 261 44" fill="none"><path d="M52.732 1.011c-1.062-.464-2.24-.598-3.38-.385-1.14.213-2.19.763-3.01 1.578L16.435 31.287a2.15 2.15 0 01-1.385.535 2.15 2.15 0 01-1.373-.564l-3.546-3.6c-.803-.831-1.84-1.403-2.974-1.64a5.96 5.96 0 00-3.388.313A5.78 5.78 0 00.098 31.663L0 40.697l3.9.041.098-9.034c.004-.383.123-.757.34-1.073.218-.316.525-.562.883-.705a2.07 2.07 0 011.128-.098c.377.079.724.267.993.541l3.546 3.6a6.25 6.25 0 004.119 1.746 6.25 6.25 0 004.155-1.42l29.908-29.083c.276-.268.625-.449 1.004-.52a2.07 2.07 0 011.126.123c.354.15.657.402.868.723.21.32.321.697.317 1.08l-.38 34.868 3.9.041.38-34.868a5.78 5.78 0 00-.935-3.25 5.78 5.78 0 00-3.054-2.2z" fill="#1a1a1a"/><path d="M78.792 28.074l-6.892-12.578h-3.753l-.283 25.957h3.9c.144-13.161.186-17.037-.154-19.563l6.621 12.3h.99l6.887-12.122c-.395 2.446-.438 6.394-.581 19.519h3.938l.283-25.957h-3.753l-7.202 12.429z" fill="#1a1a1a"/><path fill-rule="evenodd" clip-rule="evenodd" d="M100.568 22.452c2.502.026 4.543 1.803 5.51 4.263l.52-3.834h3.459l-.206 18.939h-3.974l.043-3.949c-.37 1.244-1.14 2.333-2.192 3.101a5.52 5.52 0 01-3.632 1.153c-4.6-.049-7.279-4.136-7.215-10.022.065-5.923 2.976-9.695 7.687-9.646zm-3.751 9.797c-.043 3.949 1.808 6.345 4.531 6.374 2.723.029 4.59-2.401 4.632-6.277.042-3.876-1.771-6.344-4.494-6.373-2.723-.029-4.626 2.328-4.669 6.277z" fill="#1a1a1a"/><path d="M128.954 23.118l-4.452-.047-6.859 7.935c.332-3.397.36-5.993.459-15.023l-3.938-.042-.283 25.957h3.938c.045-4.168.002-6.984-.156-9.325l6.632 9.394 4.49.047-7.36-10.206 7.529-8.732z" fill="#1a1a1a"/><path fill-rule="evenodd" clip-rule="evenodd" d="M129.606 32.595c.065-5.959 3.309-9.837 8.167-9.786 4.967.052 8.238 3.816 7.937 11.236l-12.217-.129c.148 3.329 1.892 5.322 4.394 5.348a4.5 4.5 0 002.566-.861 4.5 4.5 0 001.443-2.277l3.455.438a6.82 6.82 0 01-2.687 4.328 6.82 6.82 0 01-4.849 1.626c-5.004-.053-8.276-3.78-8.209-9.922zm8.132-6.605c-2.355-.025-4.033 1.931-4.214 5.038l8.28.087c.033-3.071-1.564-5.099-4.066-5.125z" fill="#1a1a1a"/><path d="M160.28 28.933l-6.892-12.578h-3.753l-.283 25.957h3.9c.144-13.161.186-17.037-.155-19.563l6.622 12.3h.99l6.887-12.122c-.395 2.446-.438 6.394-.581 19.519h3.937l.283-25.957h-3.753l-7.202 12.429z" fill="#1a1a1a"/><path fill-rule="evenodd" clip-rule="evenodd" d="M174.368 33.067c.065-5.959 3.309-9.837 8.166-9.786 4.968.052 8.239 3.816 7.937 11.236l-12.217-.129c.148 3.329 1.893 5.322 4.395 5.348a4.5 4.5 0 002.566-.861 4.5 4.5 0 001.443-2.277l3.455.438a6.82 6.82 0 01-2.687 4.328 6.82 6.82 0 01-4.849 1.626c-5.005-.053-8.276-3.78-8.209-9.922zm8.131-6.605c-2.355-.025-4.032 1.931-4.213 5.038l8.279.087c.034-3.071-1.563-5.099-4.066-5.125z" fill="#1a1a1a"/><path d="M198.011 16.826l-4.011-.042-.283 25.958 12.989.137.04-3.62-8.979-.095.244-22.338z" fill="#1a1a1a"/><path fill-rule="evenodd" clip-rule="evenodd" d="M207.062 33.412c.066-5.996 3.456-9.799 8.424-9.747 5.004.053 8.348 3.927 8.282 9.923-.065 5.996-3.492 9.799-8.497 9.746-4.967-.052-8.274-3.926-8.209-9.922zm3.791.004c-.043 3.912 1.808 6.345 4.457 6.373 2.723.029 4.626-2.364 4.669-6.276.042-3.875-1.808-6.308-4.531-6.337-2.65-.028-4.553 2.365-4.595 6.24z" fill="#1a1a1a"/><path fill-rule="evenodd" clip-rule="evenodd" d="M234.142 23.862c-4.967-.052-8.358 3.751-8.423 9.747-.065 5.996 3.241 9.87 8.209 9.922 5.005.053 8.432-3.75 8.497-9.746.066-5.996-3.276-9.87-8.283-9.923zm-.175 16.123c-2.65-.028-4.5-2.461-4.457-6.373.042-3.875 1.945-6.268 4.594-6.24 2.723.029 4.574 2.462 4.531 6.337-.042 3.912-1.945 6.305-4.668 6.276z" fill="#1a1a1a"/><path d="M255.702 24.455l4.453.047-7.529 8.732 7.359 10.206-4.489-.047-6.633-9.394c.159 2.342.202 5.158.156 9.326l-3.937-.042.283-25.957 3.937.042c-.098 9.03-.127 11.626-.458 15.023l6.858-7.936z" fill="#1a1a1a"/></svg>
  </a>
  <span class="store">%s</span>
</div>

<div class="card">
  <img src="%s" alt="Результат виртуальной примерки" class="result-img">
  <div class="info">
    <h2>Образ</h2>
    %s
  </div>
</div>

<a href="%s" class="cta" target="_blank">Попробовать тоже →</a>

<div class="footer">
  Создано с помощью <a href="https://makemeelook.ai" target="_blank">MakeMeLook</a> — AI-стилист для интернет-магазинов
</div>

</body>
</html>`,
		storeName,           // title
		storeName,           // og:title
		resultURL,           // og:image
		storeName,           // twitter:title
		resultURL,           // twitter:image
		storeName,           // header store name
		resultURL,           // result image
		productListHTML,     // product list
		siteURL,             // CTA link
	)

	fmt.Fprint(w, html)
}
