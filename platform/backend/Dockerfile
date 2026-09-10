# Бэкенд платформы — multi-stage: сборка статического бинаря + минимальный рантайм.
FROM golang:1.25-alpine AS build
WORKDIR /src
# Кэш зависимостей отдельным слоем.
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Статический бинарь (CGO off), встроенные миграции идут в бинарь.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/sync-catalog ./cmd/sync-catalog \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/embed-images ./cmd/embed-images \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/embed-backfill ./cmd/embed-backfill \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/coerce-categories ./cmd/coerce-categories

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/ /usr/local/bin/
USER app
EXPOSE 8090
# Миграции применяются на старте (MIGRATE_ON_START=true по умолчанию).
ENTRYPOINT ["server"]
