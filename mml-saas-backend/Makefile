.PHONY: build run test test-coverage lint deps migrate-up migrate-down migrate-create update setup clean seed-avatars help

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build -trimpath -ldflags="-s -w"
GOTEST=$(GOCMD) test
GOMOD=$(GOCMD) mod
GOLINT=golangci-lint

SERVICE=mml-v2-backend
BINARY=bin/server

-include .env

DATABASE_URL ?= postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

# Build
build:
	$(GOBUILD) -o $(BINARY) ./cmd/server

# Run
run:
	$(GOCMD) run ./cmd/server

# Testing
test:
	$(GOTEST) -v ./...

test-coverage:
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

# Linting
lint:
	$(GOLINT) run ./...

# Dependencies
deps:
	$(GOMOD) download
	$(GOMOD) tidy

# Database migrations
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir migrations -seq $$name

# Deploy: pull, build, migrate, restart
update:
	git pull
	$(GOMOD) download
	$(GOMOD) tidy
	$(GOBUILD) -o $(BINARY) ./cmd/server
	chown makemelook:makemelook ./bin/server
	chown makemelook:makemelook ./.env
	chmod +x ./bin/server
	migrate -path migrations -database "$(DATABASE_URL)" up
	systemctl restart $(SERVICE)
	systemctl status $(SERVICE)

# Initial server setup (run once from the cloned repo directory)
setup:
	@echo "Setting up $(SERVICE) from $(CURDIR)"
	sudo useradd -r -s /bin/false makemelook || true
	sudo mkdir -p /var/log/makemelook
	sudo chown makemelook:makemelook /var/log/makemelook
	sed -e 's|{{WORKDIR}}|$(CURDIR)|g' -e 's|{{USER}}|makemelook|g' \
		infra/$(SERVICE).service | sudo tee /etc/systemd/system/$(SERVICE).service > /dev/null
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE)
	@echo "Done. Now create .env from .env.example, then: make build && sudo systemctl start $(SERVICE)"

# Seed avatars
seed-avatars:
	./seeds/seed-avatars.sh

# Clean
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Help
help:
	@echo "Available targets:"
	@echo "  build          - Build server binary"
	@echo "  run            - Run server (go run)"
	@echo "  test           - Run tests"
	@echo "  test-coverage  - Run tests with coverage report"
	@echo "  lint           - Run linter"
	@echo "  deps           - Download and tidy dependencies"
	@echo "  migrate-up     - Apply all migrations"
	@echo "  migrate-down   - Rollback last migration"
	@echo "  migrate-create - Create new migration"
	@echo "  update         - Pull, build, migrate, restart (deploy)"
	@echo "  setup          - Initial server setup"
	@echo "  seed-avatars   - Upload avatar images to Minio and DB"
	@echo "  clean          - Remove build artifacts"
