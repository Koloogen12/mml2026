# syntax=docker/dockerfile:1.6
# ============================================================================
# demo-for-mml-main (shop витрина) — built with Vite, served by nginx on /shop
# ============================================================================

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build

# Inject API URL + project UUID into the Vite build. These are baked into
# the JS bundle at compile time (import.meta.env.VITE_*).
ARG VITE_API_URL=http://localhost:3010
ARG VITE_PROJECT_ID=11111111-1111-1111-1111-111111111111
ARG VITE_WIDGET_URL=http://localhost:4173
# Path the shop is served under (e.g. /shop/ or /shopping/). Must have
# leading AND trailing slash. Passed to `vite build --base=` so React Router
# basename + all asset URLs pick up the prefix.
ARG VITE_BASE_PATH=/shop/
# URL fragment used inside /usr/share/nginx/html/<BASE_DIR> — kept in sync
# with VITE_BASE_PATH so nginx.conf finds the files.
ARG BASE_DIR=shop
# Which nginx.conf to use (docker/nginx.conf = local, nginx.shopping.conf = deploy)
ARG NGINX_CONF=docker/nginx.conf
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_PROJECT_ID=${VITE_PROJECT_ID}
ENV VITE_WIDGET_URL=${VITE_WIDGET_URL}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --loglevel=error

# Source
COPY . .

# Rewrite widget <script> tag in index.html to point at local docker services.
# This is safe inside the container — it only touches the build copy.
RUN sed -i \
      -e "s|src=\"[^\"]*loader\.js\"|src=\"${VITE_WIDGET_URL}/widget/loader.js\"|g" \
      -e "s|data-project=\"[^\"]*\"|data-project=\"${VITE_PROJECT_ID}\"|g" \
      -e "s|data-api=\"[^\"]*\"|data-api=\"${VITE_API_URL}\"|g" \
      -e "s|data-cdn=\"[^\"]*\"|data-cdn=\"${VITE_WIDGET_URL}/widget\"|g" \
      index.html \
 && echo "--- patched index.html ---" \
 && grep -A4 "MakeMeLook widget" index.html

# Production build with configurable base path. --base overrides vite.config.ts.
RUN npm run build -- --base=${VITE_BASE_PATH} \
 && ls -la dist

# ---------- Stage 2: runtime ----------
FROM nginx:1.27-alpine

ARG BASE_DIR=shop
ARG NGINX_CONF=docker/nginx.conf

# Serve under the configured base dir (shop or shopping)
RUN mkdir -p /usr/share/nginx/html/${BASE_DIR}
COPY --from=build /app/dist/ /usr/share/nginx/html/${BASE_DIR}/

# Both local and shopping nginx.conf files live under docker/ in the build
# context; pick one with the NGINX_CONF build arg.
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

EXPOSE 80
