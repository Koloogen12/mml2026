# syntax=docker/dockerfile:1.6

# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# VITE_* переменные должны быть доступны на этапе сборки — Vite их инлайнит.
ARG VITE_API_URL
ARG VITE_WIDGET_CDN_URL
ARG VITE_PREVIEW_URL
ENV VITE_API_URL=$VITE_API_URL \
    VITE_WIDGET_CDN_URL=$VITE_WIDGET_CDN_URL \
    VITE_PREVIEW_URL=$VITE_PREVIEW_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine

# Убираем дефолтный конфиг, кладём свой (слушает :8080 для Cloud Run)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
