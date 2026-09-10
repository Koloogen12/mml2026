# Runbook: waitlist → главная makemelook.ai

Статус: **всё готово и провалидировано, НЕ задеплоено.** Жду: (1) явное «go» на флип боевого домена, (2) реальные ссылки (Telegram/оферта/политика/партнёрам).

## Сервер (подтверждено read-only 2026-07-07)
- Host `135.106.146.200`, ключ `~/.ssh/id_ed25519_mml` (работает). Backend :8089 (`systemctl mml-backend`), Go 1.23 сборка **на сервере**. Файлы под `/opt/makemelook/`, юзер `makemelook`.
- Vhost `/etc/nginx/sites-enabled/makemelook.ai` сейчас = 80→443 redirect + HTTPS `location / → proxy :3001` (Next.js лендинг). Cert Let's Encrypt для makemelook.ai уже есть.
- **Лендинг остаётся на makemelook.tech и b2b.makemelook.ai** — переносить ничего не нужно. Меняем ТОЛЬКО vhost makemelook.ai.

## 🔴 git-drift: серверный бэкенд ОПЕРЕЖАЕТ git
Диффы показали: серверные `routes.go` (kill-switch paused-guard + доп. роуты), `server.go` (`pausedChecker`), `repository.go` (`SyncHistory`) новее локального клона. **НЕ рсинкать локальные `routes.go`/`server.go`/`repository.go` на сервер** — снесёт незакоммиченный прод-код.

### Безопасная процедура бэкенда (waitlist-эндпоинт)
1. Рсинк ТОЛЬКО новых (аддитивных) файлов — риск нулевой:
   - `internal/model/waitlist_signup.go`
   - `internal/repository/waitlist_signup.go`
   - `internal/service/waitlist.go`
   - `internal/handler/waitlist.go`
   - `migrations/000045_waitlist_signups.{up,down}.sql`
2. Три маленькие правки применить **на серверных версиях** файлов (по 3–4 строки, аддитивно):
   - `internal/repository/repository.go`: в struct и в `newRepos` после `ConsentLog` добавить `WaitlistSignup *WaitlistSignupRepository` / `WaitlistSignup: newWaitlistSignupRepository(db),`.
   - `internal/server/server.go`: поле `waitlist *handler.WaitlistHandler`; рядом с `oauthSvc` — `waitlistSvc := service.NewWaitlist(repos, 4800)`; в struct-литерале — `waitlist: handler.NewWaitlist(waitlistSvc),`.
   - `internal/server/routes.go`: после `r.Get("/reference", s.reference.Get)` — `r.Post("/waitlist", s.waitlist.Signup)`.
3. Сборка на сервере (как в [[reference_prod_server]]): `go build -trimpath -ldflags="-s -w" -o bin/server.new ./cmd/server` → migrate up (000045) → атомарный swap → `systemctl restart mml-backend` → tail лога.
4. Миграция `000045` — номер свободен (сервер на 000044, проверено). Применять через `/usr/local/bin/migrate ... up`.

## Статика waitlist
1. Заполнить `CONFIG` в `index.html`: `TELEGRAM_URL`, `TERMS_URL`, `PRIVACY_URL`, `PARTNERS_URL` (реальные). `WAITLIST_ENDPOINT` = `/api/v1/waitlist` (уже). `BASE_QUEUE` 4800 = base в `NewWaitlist(repos, 4800)` — держать синхронно.
2. Рсинк `waitlist/` → напр. `/opt/makemelook/waitlist/`, chown www-data.

## nginx makemelook.ai (изменение vhost)
В HTTPS-server makemelook.ai заменить `location / { proxy_pass :3001 }` на:
```nginx
root /opt/makemelook/waitlist;
index index.html;
location / { try_files $uri $uri/ /index.html; }
location /api/ { proxy_pass http://127.0.0.1:8089; proxy_set_header Host $host;
                 proxy_set_header X-Real-IP $remote_addr;
                 proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                 proxy_set_header X-Forwarded-Proto $scheme; }
```
`nginx -t && systemctl reload nginx`. Same-origin → CORS не нужен.

## Проверка и откат
- Проверка: открыть https://makemelook.ai → отправить тестовый номер → `200 {position}` → строка в `waitlist_signups`.
- Откат: перед правкой `cp makemelook.ai makemelook.ai.bak`; откат = вернуть `.bak` + `reload nginx` (лендинг снова на корне). Бэкенд-эндпоинт аддитивный, откат не требуется.

## Заметки
- OAuth (Apple/Яндекс) — заглушки. SMS-верификация номера — не реализована (waitlist собирает контакт, верификация позже).
- Первым делом по бэкенду вообще — привести репо в соответствие серверу (закоммитить серверное состояние); waitlist-правки сделаны аддитивно, чтобы не мешать этому.
