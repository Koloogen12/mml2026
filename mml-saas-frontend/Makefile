.PHONY: update build

build:
	npm install
	npm run build
	chown -R www-data:www-data dist/

update:
	git pull
	npm install
	npm run build
	chown -R www-data:www-data dist/
	systemctl reload nginx
