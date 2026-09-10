WIDGET_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))dist
WIDGET_USER := www-data

update:
	git pull
	npm install
	npm run build
	chown -R $(WIDGET_USER):$(WIDGET_USER) $(WIDGET_DIR)

.PHONY: update
