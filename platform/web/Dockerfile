# Веб — сборка трёх приложений (buyer/partner/admin) + отдача через nginx,
# который заодно реверс-проксирует API на бэкенд. Приложения — по поддоменам.
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /web
# Кэш зависимостей: сначала манифесты воркспейса.
COPY web/pnpm-workspace.yaml web/package.json web/pnpm-lock.yaml* ./
COPY web/packages ./packages
COPY web/apps ./apps
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @mml/buyer build \
 && pnpm --filter @mml/partner build \
 && pnpm --filter @mml/admin build

FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY web/proxy_common.conf /etc/nginx/proxy_common.conf
COPY --from=build /web/apps/buyer/dist   /usr/share/nginx/html/buyer
COPY --from=build /web/apps/partner/dist /usr/share/nginx/html/partner
COPY --from=build /web/apps/admin/dist   /usr/share/nginx/html/admin
# Страница вейтлиста (корень домена). Лежит вне монорепо web/, поэтому
# контекст сборки — корень платформы: см. build.context в compose.
COPY waitlist /usr/share/nginx/html/root
EXPOSE 80
