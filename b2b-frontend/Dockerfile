# syntax=docker/dockerfile:1.6
# b2b-frontend (лендинг MakeMeLook) — Next.js 14 + Prisma/SQLite.
#
# Не используем output:standalone: Prisma-клиент и его query-engine не всегда
# попадают в трассировку, а тонкий образ здесь не выигрыш — лендинг один.
# Поэтому переносим node_modules из build-стадии целиком (в них уже лежит
# сгенерированный .prisma/client).

FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .

# BASE_URL читается в build-time: app/layout.tsx задаёт metadataBase через
# new URL(process.env.BASE_URL ?? ''), и на пустой строке сборка падает с
# ERR_INVALID_URL при сборе данных страниц.
ARG BASE_URL=https://makemelook.ai
ARG NEXTAUTH_URL=https://makemelook.ai
ENV BASE_URL=${BASE_URL} \
    NEXTAUTH_URL=${NEXTAUTH_URL}
# DATABASE_URL нужен prisma generate только как строка — реальный файл
# подключается на рантайме из тома /app/data.
ENV DATABASE_URL="file:../data/dev.db"
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl wget

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# База блога живёт в томе; каталог создаётся на случай пустого тома.
RUN mkdir -p /app/data

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["npm", "run", "start"]
