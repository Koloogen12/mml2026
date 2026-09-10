# Деплой платформы MakeMeLook

Прод-стек — один `docker compose` файл: Postgres(pgvector) + reco(эмбеддинги на CPU) + backend(Go) + web(nginx, 3 приложения по поддоменам). TLS терминируется на хосте (certbot).

## 0. Требования
- Сервер Linux (2+ vCPU, **8+ ГБ RAM** — reco с torch+Marqo прожорлив), Docker + docker compose.
- DNS на IP сервера:
  - `makemelook.ai`, `www.makemelook.ai` → покупатель
  - `b2b.makemelook.ai` → кабинет партнёра
  - `admin.makemelook.ai` → админка (ограничить по IP!)
  - ⚠️ `admin.makemelook.tech` — это ПРОД ВИДЖЕТА, другая система. Не занимать.

## 1. Выкат
```bash
# на сервере
git clone <repo> && cd platform          # или rsync платформы
cp .env.prod.example .env.prod
# сгенерировать секреты и заполнить .env.prod:
openssl rand -hex 32   # для JWT_SECRET, CLICK_SIGNING_SECRET, ADMIN_TOKEN, PG_PASSWORD
# вписать ANTHROPIC_API_KEY (ротированный!), RESEND_API_KEY, RESEND_FROM (верифиц. домен)

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Бэкенд применит миграции на старте. Проверка:
```bash
curl -s localhost/healthz          # ok
docker compose -f docker-compose.prod.yml logs -f backend
```

## 2. TLS (certbot на хосте)
Поставить nginx/certbot на хост как терминатор TLS перед compose-web (или заменить web-порт на 443 с монтированием сертификатов). Выпустить сертификаты на 3 поддомена:
```bash
certbot --nginx -d makemelook.ai -d www.makemelook.ai -d b2b.makemelook.ai -d admin.makemelook.ai
```

## 3. Первичные данные каталога
Пока партнёрских фидов нет — импорт снапшота (как в dev) или сразу подключение партнёров.
После любого наполнения — досчитать эмбеддинги и зоны (в контейнере backend):
```bash
docker compose -f docker-compose.prod.yml exec backend embed-backfill     # текстовые (e5)
docker compose -f docker-compose.prod.yml exec backend embed-images       # фото (Marqo)
docker compose -f docker-compose.prod.yml exec backend coerce-categories  # зоны по фото
```
Первый вызов Marqo тянет ~600 МБ весов (кэшируется в volume `hfcache`) — прогреть заранее:
```bash
curl -s -XPOST localhost:8091/embed-fashion-text -d '{"texts":["warm coat"]}' # через сеть compose
```

## 4. Онбординг партнёра (когда подключают фид)
```bash
# по cron раз в N часов — синк всех источников:
docker compose -f docker-compose.prod.yml exec backend sync-catalog
# затем инкрементально досчитать новое:
docker compose -f docker-compose.prod.yml exec backend embed-images
docker compose -f docker-compose.prod.yml exec backend coerce-categories
```
Или синк конкретного источника из админки: `POST /api/v1/admin/sources/{id}/sync`.

## 5. Проверки после выката
- `GET /healthz` → ok
- Покупатель: открыть `makemelook.ai`, задать запрос — приходят карточки (гибрид+персонализация).
- Партнёр: `b2b.makemelook.ai` — вход по коду (письмо Resend).
- Админка: `admin.makemelook.ai` — с заголовком `X-Admin-Token` (гейт); ограничить IP.

## 6. Эксплуатация
- **Бэкапы БД:** `pg_dump` volume `pgdata` по cron, выгрузка вовне.
- **Cron:** `sync-catalog` + `embed-images` + `coerce-categories`; опц. периодический `passport refine`.
  - `reactivate-leads` — раз в сутки: авто-дрип заглохшим лидам (подборка в чат; кулдаун 14 дней). Сначала `-dry-run` для проверки объёма.
- **Логи:** `docker compose logs`; добавить сборщик (Loki/ELK) при росте.
- **Ротация ключей:** ANTHROPIC_API_KEY и RESEND_API_KEY — сменить (светились в переписке).

## 7. Откат
```bash
docker compose -f docker-compose.prod.yml down            # стоп (данные в volume целы)
git checkout <предыдущий-тег> && docker compose ... up -d --build
```
Миграции только вперёд; для отката схемы — `*_.down.sql` вручную.

## ⚠️ Про сервер виджета
`135.106.146.200` — прод действующего ВИДЖЕТА (его Go-исходники впереди git, деплой хрупкий). Платформу ставить **на отдельный сервер/домен**, не поверх виджета, чтобы не задеть работающий прод.
