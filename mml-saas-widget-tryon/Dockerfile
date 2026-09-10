# syntax=docker/dockerfile:1.6

# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Widget билдится в IIFE бандл. API URL-ы инлайнятся на этапе сборки —
# если в клиентском script-теге не переопределены, используются дефолты.
ARG VITE_API_BASE_URL
ARG VITE_API_TARGET
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_TARGET=$VITE_API_TARGET

COPY package*.json ./
RUN npm ci

COPY . .
# build = tsc + vite build (widget) + vite build (loader)
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Отдаём собранные widget.js, widget.css, loader.js как статику
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
