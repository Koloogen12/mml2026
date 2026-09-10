# QA Fix Plan — MakeMeLook SaaS
**Date:** 2026-04-08

## Phase 1: Security Critical (TODAY)
**Goal:** Close all exploitable vulnerabilities

1. **XSS in share page** — html.EscapeString() on all interpolated values (C-BE-1)
2. **OAuth postMessage wildcard** — restrict to project domain (C-BE-2)
3. **Request body size limit** — http.MaxBytesReader 1MB (C-BE-3)
4. **DB SSL** — make sslmode configurable (C-BE-4)
5. **OpenCart API key** — move to header (C-BE-5)

## Phase 2: Broken Features (TODAY)
**Goal:** Fix features that are completely non-functional

6. **Delete account backend call** — add DELETE endpoint + clear localStorage (C-WG-1)
7. **OAuth URL path** — fix /api/v1/widget → /api/widget/v1 (C-WG-2)
8. **Photo upload failure** — show error, don't set fake ID (C-WG-3)
9. **Logout server invalidation** — call authApi.logout() (H-AD-3)
10. **Delete project error handling** — wrap in try/catch (C-AD-1)

## Phase 3: High-Priority Bugs (NEXT SESSION)
**Goal:** Fix logic bugs and data issues

11. **Swipe deselect** — selectProduct → deselectProduct (H-WG-2)
12. **euSize NaN** — proper size mapping (H-WG-6)
13. **Login limiter memory leak** — add cleanup (H-BE-1)
14. **ListProjects limit** — cap at 200 (H-BE-3)
15. **normalizeSize panic** — bounds check (M-BE)
16. **Category enum mismatch** — outwear → outerwear (M-BE)
17. **CS-Cart code on all sites** — gate behind platform (H-WG-8)
18. **Remember me** — remove or implement (H-AD-1)
19. **Terms/Privacy links** — create pages or external links (H-AD-2)

## Phase 4: UX + Hardcode Cleanup (LATER)
**Goal:** Remove hardcoded values, improve UX

20. **Assets base URL** — dynamic from config (H-WG-1)
21. **Preview URL** — env variable (C-AD-2)
22. **Tilda sync reload** — in-place refresh (H-WG-4)
23. **Size options** — from product sizeVariants (H-WG-5)
24. **Currency hardcode** — parse from DOM/config (H-WG-3)
25. **Instagram share** — remove or save-then-share (H-WG-10)
26. **clipboard fallback** (H-WG-9)
27. **Default body params** — realistic values (M-WG)

## Phase 5: i18n Sweep (LATER)
**Goal:** Full internationalization

28. All validation messages through t()
29. Breadcrumbs through t()
30. ConfirmDialog, AddDomainDialog, EditIntegrationDialog
31. CopyButton, ErrorBoundary
32. Date formatting locale-aware
33. Analytics revenue currency from config
34. Reference data labels localized
35. Widget hardcoded Russian strings
