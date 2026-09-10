# MakeMeLook Platform — dev-команды
# Порядок первого запуска: make up → make import → make embed → make dev

SCRATCH := /tmp/mml-platform

.PHONY: up down backend reco web import embed dev status

up:            ## Postgres(pgvector) + MinIO
	docker compose -f docker-compose.dev.yml up -d
	@until docker compose -f docker-compose.dev.yml ps postgres --format '{{.Status}}' | grep -q healthy; do sleep 1; done
	@echo "✓ postgres :5433, minio :9010"

down:
	docker compose -f docker-compose.dev.yml down

backend:       ## Go API :8090 (миграции накатываются на старте)
	cd backend && go run ./cmd/server

reco:          ## Инференс-сайдкар :8091
	cd reco && .venv/bin/uvicorn app:app --port 8091

web:           ## Buyer-приложение :5173
	cd web && pnpm --filter @mml/buyer dev

import:        ## Каталог из снапшота виджетной БД (588 товаров)
	cd backend && go run ./cmd/import-snapshot

embed:         ## Эмбеддинги для семантического поиска (нужен запущенный reco)
	cd backend && go run ./cmd/embed-backfill

dev:           ## Всё разом в фоне (логи в /tmp/mml-platform/)
	@mkdir -p $(SCRATCH)
	@$(MAKE) up
	@cd reco && (.venv/bin/uvicorn app:app --port 8091 &> $(SCRATCH)/reco.log &)
	@cd backend && go build -o $(SCRATCH)/server ./cmd/server && ($(SCRATCH)/server &> $(SCRATCH)/backend.log &)
	@until curl -sf localhost:8090/healthz > /dev/null 2>&1; do sleep 1; done
	@echo "✓ backend :8090, reco :8091 — запускайте: make web"

status:
	@curl -sf localhost:8090/healthz > /dev/null 2>&1 && echo "✓ backend :8090" || echo "✗ backend"
	@curl -sf localhost:8091/healthz > /dev/null 2>&1 && echo "✓ reco :8091" || echo "✗ reco"
	@docker compose -f docker-compose.dev.yml ps --format '✓ {{.Name}} {{.Status}}' 2>/dev/null || true
