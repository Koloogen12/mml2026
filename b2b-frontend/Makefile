SERVICE_NAME = mml-b2b-frontend
SERVICE_USER = mmlb2bfr
BACKEND_USER = mmlbackend
LOG_DIR = /var/log/makemelook
PROJECT_DIR = $(shell pwd)
WIDGET_FILES_DIR = $(PROJECT_DIR)/public/widget/files

.PHONY: install update

## install: Run setup script (requires sudo)
install:
	@echo "Running setup (requires sudo)..."
	sudo bash setup.sh

## update: Pull, build, lock down permissions, restart
update:
	@echo "=== Unlocking files for update ==="
	find $(PROJECT_DIR) -not -path "$(WIDGET_FILES_DIR)/*" -not -path "$(WIDGET_FILES_DIR)" -exec chmod u+w {} +
	@echo "=== Pulling latest changes ==="
	git pull
	@echo "=== Installing dependencies ==="
	npm ci
	@echo "=== Building ==="
	npm run build
	@echo "=== Locking file permissions (read-only) ==="
	find $(PROJECT_DIR) -not -path "$(WIDGET_FILES_DIR)/*" -not -path "$(WIDGET_FILES_DIR)" -type d -exec chmod 555 {} +
	find $(PROJECT_DIR) -not -path "$(WIDGET_FILES_DIR)/*" -not -path "$(WIDGET_FILES_DIR)" -type f -exec chmod 444 {} +
	@echo "=== Allowing .next/cache writes ==="
	find $(PROJECT_DIR)/.next/cache -type d -exec chmod 755 {} +
	find $(PROJECT_DIR)/.next/cache -type f -exec chmod 644 {} +
	@echo "=== Allowing log writes ==="
	chmod 755 $(LOG_DIR)
	chmod 644 $(LOG_DIR)/b2b-frontend.log
	@echo "=== Restarting service ==="
	sudo systemctl restart $(SERVICE_NAME).service
	@echo "=== Update complete ==="
