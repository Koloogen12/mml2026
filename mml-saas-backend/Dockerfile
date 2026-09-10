# syntax=docker/dockerfile:1.6

# ---- Build stage -----------------------------------------------------------
FROM golang:1.25-alpine AS builder

# git нужен для go mod (часть модулей тянется через git), ca-certificates —
# чтобы собранный бинарник мог ходить в Gemini/SMTP/Neon по HTTPS.
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /src

# Сначала модули — чтобы использовать кэш слоёв при изменении только кода.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Статический бинарь без CGO: легко положить в distroless/scratch.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- Runtime stage ---------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

# Бинарь и служебные ассеты (если бэкенд их раздаёт).
COPY --from=builder /out/server /app/server
COPY --from=builder /src/assets /app/assets
COPY --from=builder /src/migrations /app/migrations

# Cloud Run отправляет трафик на $PORT (по умолчанию 8080).
ENV SERVER_PORT=8080
EXPOSE 8080

USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
