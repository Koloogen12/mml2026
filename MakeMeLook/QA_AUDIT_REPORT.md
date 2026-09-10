# MakeMeLook SaaS — QA Audit Report
**Date:** 2026-04-08
**Auditor:** Claude Opus 4.6 (automated)

## Summary

| Component | Critical | High | Medium | Low | Total |
|-----------|----------|------|--------|-----|-------|
| Backend   | 5        | 7    | 14     | 9   | 35    |
| Widget    | 5        | 10   | 16     | 11  | 42    |
| Admin     | 2        | 5    | 18     | 16  | 41    |
| **Total** | **12**   | **22** | **48** | **36** | **118** |

---

## CRITICAL Issues (12)

### Backend

#### C-BE-1. XSS in Share HTML Page
- **File:** `mml-saas-backend/internal/handler/widget_session.go:616-710`
- **Status:** [ ] Open
- **Description:** `renderShareHTML` uses `fmt.Sprintf` to inject `storeName`, `resultURL`, and product names directly into HTML without escaping. User-controlled project/product names can inject `<script>` tags.
- **Fix:** Use `html/template` or `html.EscapeString()` on all interpolated values.

#### C-BE-2. OAuth postMessage Target Origin is Wildcard
- **File:** `mml-saas-backend/internal/handler/widget_oauth.go:142`
- **Status:** [ ] Open
- **Description:** `window.opener.postMessage(result, "*")` sends OAuth result to ANY origin. Malicious sites can intercept.
- **Fix:** Pass the expected origin from session's project domain instead of `"*"`.

#### C-BE-3. No Request Body Size Limit
- **File:** `mml-saas-backend/internal/handler/response.go:35-41`
- **Status:** [ ] Open
- **Description:** `json.NewDecoder(r.Body).Decode(v)` without size limit. Any endpoint can receive multi-GB payload causing OOM.
- **Fix:** Wrap with `http.MaxBytesReader(w, r.Body, 1<<20)` (1MB limit).

#### C-BE-4. Database SSL Disabled
- **File:** `mml-saas-backend/internal/config/config.go:166,172`
- **Status:** [ ] Open
- **Description:** `sslmode=disable` hardcoded in DSN. Production DB connections unencrypted.
- **Fix:** Make sslmode configurable via env var, default to `require` in production.

#### C-BE-5. OpenCart API Key in URL
- **File:** `mml-saas-backend/internal/service/ecommerce.go:830`
- **Status:** [ ] Open
- **Description:** API key sent as URL query parameter, logged in access logs.
- **Fix:** Send as HTTP header `X-Api-Key` instead.

### Widget

#### C-WG-1. Delete Account Does Not Call Backend
- **File:** `mml-saas-widget-tryon/src/stages/DeleteAccountStage.tsx:11-14`
- **Status:** [ ] Open
- **Description:** `handleDelete` only calls `reset()` locally. No DELETE request to backend. Data persists on server. localStorage token not cleared.
- **Fix:** Call `DELETE /api/widget/v1/sessions/{token}`, clear localStorage, then reset.

#### C-WG-2. OAuth URL Path Wrong
- **File:** `mml-saas-widget-tryon/src/stages/AuthStage.tsx:155`
- **Status:** [ ] Open
- **Description:** OAuth URL built as `/api/v1/widget/auth/{provider}` but all other endpoints use `/api/widget/v1/...`.
- **Fix:** Change to `/api/widget/v1/auth/{provider}`.

#### C-WG-3. Photo Upload Failure Sets Fake ID
- **File:** `mml-saas-widget-tryon/src/stages/PhotoUploadStage.tsx:90-93`
- **Status:** [ ] Open
- **Description:** On upload failure, sets `modelPhotoId: 'local'` and navigates to showroom. Try-on requests will fail.
- **Fix:** Show error toast, keep user on upload screen.

#### C-WG-4. Hardcoded Russian String in Store
- **File:** `mml-saas-widget-tryon/src/store/index.ts:421`
- **Status:** [ ] Open
- **Description:** `'Сессия обновлена'` not through i18n translation function.
- **Fix:** Use `t('common.sessionRefreshed')`.

#### C-WG-5. XSS Risk via Unsanitized URLs
- **File:** `mml-saas-widget-tryon/src/stages/ShowroomStage.tsx:482`
- **Status:** [ ] Open
- **Description:** URLs from API injected into DOM without validation/sanitization.
- **Fix:** Validate URLs match expected patterns (https://) before use.

### Admin Frontend

#### C-AD-1. Delete Project No Error Handling
- **File:** `mml-saas-frontend/src/pages/projects/[id]/SettingsDangerTab.tsx:47-51`
- **Status:** [ ] Open
- **Description:** `handleDeleteProject` has no try/catch. Navigation happens even on API failure.
- **Fix:** Wrap in try/catch, show toast.error, navigate only on success.

#### C-AD-2. Hardcoded Preview URL
- **File:** `mml-saas-frontend/src/pages/projects/[id]/installation.tsx:461`
- **Status:** [ ] Open
- **Description:** `https://preview.makemelook.ai/${project.public_id}` hardcoded.
- **Fix:** Use `VITE_PREVIEW_URL` env variable.

---

## HIGH Issues (22)

### Backend (7)

#### H-BE-1. Login Rate Limiter Memory Leak
- **File:** `mml-saas-backend/internal/service/auth.go:455-496`
- **Status:** [ ] Open
- **Description:** `loginLimiter` stores per-email attempts with no cleanup. Unbounded memory growth.
- **Fix:** Add periodic cleanup goroutine.

#### H-BE-2. Ecommerce Sync No Context Cancellation
- **File:** `mml-saas-backend/internal/service/ecommerce.go:234`
- **Status:** [ ] Open
- **Description:** Sync goroutines use `context.Background()` with no timeout/cancellation.
- **Fix:** Pass context with timeout, track via WaitGroup.

#### H-BE-3. ListProjects No Upper Limit
- **File:** `mml-saas-backend/internal/handler/project.go:100-109`
- **Status:** [ ] Open
- **Description:** No max limit on list query. `limit=1000000` possible.
- **Fix:** Cap at 200 like other endpoints.

#### H-BE-4. Image Download No Size Limit (Ecommerce)
- **File:** `mml-saas-backend/internal/service/ecommerce.go:1194-1242`
- **Status:** [ ] Open
- **Description:** `io.ReadAll(resp.Body)` without size limit during ecommerce photo download.
- **Fix:** Use `io.LimitReader(resp.Body, 10<<20)`.

#### H-BE-5. Widget Events No Session Validation
- **File:** `mml-saas-backend/internal/handler/widget_session.go:506-522`
- **Status:** [ ] Open
- **Description:** Events endpoint accepts any project_id without verifying session ownership.
- **Fix:** Validate session belongs to project.

#### H-BE-6. Ecommerce Credentials Plaintext in DB
- **File:** `mml-saas-backend/internal/service/ecommerce.go:66-79`
- **Status:** [ ] Open
- **Description:** API keys stored unencrypted in database.
- **Fix:** Encrypt at rest with server-side key.

#### H-BE-7. Refresh Token Not Rotated
- **File:** `mml-saas-backend/internal/service/auth.go:173-206`
- **Status:** [ ] Open
- **Description:** Same refresh token reused on each refresh call.
- **Fix:** Issue new refresh token, invalidate old one.

### Widget (10)

#### H-WG-1. 30+ Image URLs Hardcoded to mml-saas.quantimo.ru
- **Files:** IntroStage, BasicParametersStage, FigureTypeStage, ShowroomStage, etc.
- **Status:** [ ] Open
- **Description:** All CDN image URLs point to hardcoded domain.
- **Fix:** Create `assetsBaseUrl` config derived from `apiBaseUrl`.

#### H-WG-2. Swipe-Up Calls selectProduct Instead of deselectProduct
- **File:** `mml-saas-widget-tryon/src/stages/ShowroomStage.tsx:516`
- **Status:** [ ] Open
- **Fix:** Change to `deselectProduct(product.id)`.

#### H-WG-3. Hardcoded 'RUB' Currency in Tilda Sync
- **File:** `mml-saas-widget-tryon/src/platforms/tilda.ts:432`
- **Status:** [ ] Open
- **Fix:** Parse currency from DOM or use project config.

#### H-WG-4. location.reload() After Product Sync
- **File:** `mml-saas-widget-tryon/src/platforms/tilda.ts:477-479`
- **Status:** [ ] Open
- **Fix:** Re-fetch session in-place without page reload.

#### H-WG-5. Size Options Hardcoded XXS-XXL
- **File:** `mml-saas-widget-tryon/src/stages/ShowroomStage.tsx:824`
- **Status:** [ ] Open
- **Fix:** Derive from product's `sizeVariants` keys.

#### H-WG-6. euSize Slider Parses 'M' as NaN
- **File:** `mml-saas-widget-tryon/src/stages/MeasurementsStage.tsx:59-60`
- **Status:** [ ] Open
- **Fix:** Use letter-based picker or proper size mapping.

#### H-WG-7. ErrorBoundary English Strings Not i18n
- **File:** `mml-saas-widget-tryon/src/components/ErrorBoundary.tsx:36,49`
- **Status:** [ ] Open

#### H-WG-8. CS-Cart addToCSCart Runs on All Sites
- **File:** `mml-saas-widget-tryon/src/stages/ShowroomStage.tsx:48-70`
- **Status:** [ ] Open
- **Fix:** Gate behind platform check.

#### H-WG-9. clipboard.writeText No Fallback
- **File:** `mml-saas-widget-tryon/src/stages/ShowroomStage.tsx:727`
- **Status:** [ ] Open

#### H-WG-10. Instagram Share Goes to Homepage
- **File:** `mml-saas-widget-tryon/src/stages/ShowroomStage.tsx:755`
- **Status:** [ ] Open
- **Fix:** Remove or change to save-then-share flow.

### Admin Frontend (5)

#### H-AD-1. "Remember Me" Checkbox Non-Functional
- **File:** `mml-saas-frontend/src/pages/auth/login.tsx:120-128`
- **Status:** [ ] Open
- **Fix:** Implement or remove.

#### H-AD-2. Terms/Privacy Links Dead (404)
- **File:** `mml-saas-frontend/src/pages/auth/register.tsx:207-219`
- **Status:** [ ] Open
- **Fix:** Create pages or link externally.

#### H-AD-3. Logout Doesn't Invalidate Server Session
- **File:** `mml-saas-frontend/src/widgets/header.tsx:57-60`
- **Status:** [ ] Open
- **Fix:** Call `authApi.logout()` before `clearAuth()`.

#### H-AD-4. Delete Account Error Handling Gap
- **File:** `mml-saas-frontend/src/pages/profile/index.tsx:512-518`
- **Status:** [ ] Open

#### H-AD-5. Group Delete Swallows Error Details
- **File:** `mml-saas-frontend/src/pages/projects/[id]/groups.tsx:55-59`
- **Status:** [ ] Open

---

## MEDIUM Issues (48)

### Backend (14)
- Rate limiter cleanup goroutine leak
- Error messages leak internal details
- Hardcoded CDN URL default
- Hardcoded CORS localhost-only
- Session token in URL (logging risk)
- No CSRF protection on auth
- SyncProducts no max product count
- HTTP clients per-request in ecommerce
- normalizeSize panic on empty input
- Category enum mismatch (outwear vs outerwear)
- Ecommerce sync job status not persisted
- Widget events batch no size limit
- Share HTML raw result URL injection
- Diagnostic cron uses wrong repository

### Widget (16)
- Loader version manual bump
- Privacy consent resets on re-render
- Date formatting English-only
- AccountStage history/cart always disabled
- Background image doesn't change by gender
- Step counter doesn't adapt to disabled stages
- No type="button" on many buttons
- Mixed Tailwind/BEM class patterns
- CheckBadge unprefixed Tailwind classes
- pollTryOnResult 6-min timeout no feedback
- Instagram share useless
- "Яндекс ID" hardcoded Russian
- Unrealistic default body params (BMI 35)
- "Powered by" identical both languages
- flushEvents async in beforeunload (unreliable)
- "Gross" belly shape offensive in English

### Admin (18)
- Breadcrumbs all English
- ConfirmDialog hardcoded English
- AddDomainDialog hardcoded English
- EditIntegrationDialog hardcoded English
- CopyButton hardcoded English
- Widget tab tooltips hardcoded English
- Analytics dates hardcoded en-US
- Analytics revenue hardcoded Ruble ₽
- useAllProducts limit 200 hardcoded
- Profile avatar error messages English
- Password validation messages English
- Missing 404 page
- Integration polling no timeout
- Login validation messages English
- Settings validation messages English
- Profile validation messages English
- Security page validation English
- Dashboard quick actions silent fail

---

## LOW Issues (36)

### Backend (9)
- Reference data labels Russian-only
- Mailer sends plain text only
- No pagination on analytics top products
- Missing request ID in error logs
- Server health check minimal
- CSCart addon writes all to memory
- SyncProducts leaks error details
- DeleteAccount doesn't revoke sessions
- Cron job error stops registration chain

### Widget (11)
- console.log in production code
- OnboardingLayout loads images per-render
- Dead code: CardSwitch, ZoneSwitcher, StageCta
- stageHistory grows unbounded
- tryonResult stage maps to null
- Default config language 'ru' vs 'auto'
- PhotoRecommendations uses `as any`
- TryOnLoader uses `as any`
- OAuth popup no origin check
- MML logo SVG innerHTML pattern
- config/index.ts never used at runtime

### Admin (16)
- Settings validation messages English
- Profile validation messages English
- Security page validation English
- Widget default config English-only
- Clipboard API no error handling
- Logo upload no validation in wizard
- Error fallback message English
- Password reset hardcoded 60s cooldown
- Domain add/delete no error toast
- Widget CDN URL hardcoded fallback
- Activity feed synthesized not real
- AnalyticsKPI type not imported
- Project wizard no validation step 2
- Breadcrumbs missing for several routes
- Project status uses `as any`
- Integrations tab manual state management
