# syntax=docker/dockerfile:1.6
# ============================================================================
# mml-saas-backend — local docker build
# Multi-stage: builds Go server + bundles golang-migrate CLI + alpine runtime
# ============================================================================

# ---------- Stage 1: build ----------
FROM golang:1.25-alpine AS build

# Build deps
RUN apk add --no-cache git ca-certificates

WORKDIR /src

# Cache modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build server binary (static, stripped)
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Build golang-migrate CLI (only postgres driver, no file+http noise)
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.17.1 \
    && cp "$(go env GOPATH)/bin/migrate" /out/migrate

# ---------- Stage 2: runtime ----------
FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl bash postgresql16-client \
    && addgroup -S app && adduser -S app -G app

WORKDIR /app

# Bring in binaries
COPY --from=build /out/server  /usr/local/bin/server
COPY --from=build /out/migrate /usr/local/bin/migrate

# Bring in static assets required by the app at runtime
COPY migrations /app/migrations
COPY assets     /app/assets
COPY seeds      /app/seeds

# .env file is selected via build arg so the same image recipe can produce
# a local-docker build (.env.docker) or a production build (.env.shopping).
ARG ENV_FILE=.env.docker
COPY ${ENV_FILE} /app/.env

# Entrypoint handles: wait-for-postgres → migrate up → exec server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && chown -R app:app /app

USER app

EXPOSE 3010

HEALTHCHECK --interval=3s --timeout=2s --start-period=10s --retries=20 \
  CMD curl -sf http://127.0.0.1:3010/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
