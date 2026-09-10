.PHONY: update build

WIDGET_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))dist
WIDGET_USER := www-data

build:
	npm install
	npm run build
	chown -R $(WIDGET_USER):$(WIDGET_USER) $(WIDGET_DIR)

update:
	git pull
	npm install
	npm run build
	chown -R $(WIDGET_USER):$(WIDGET_USER) $(WIDGET_DIR)
	systemctl reload nginx
