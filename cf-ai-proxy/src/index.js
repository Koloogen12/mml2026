// AI-прокси для чата makemelook.ai: пробрасывает запросы к api.anthropic.com
// через edge Cloudflare. Ключ Anthropic хранится в секретах воркера и не
// покидает Cloudflare; бэкенд аутентифицируется заголовком x-proxy-key.
const UPSTREAM = "https://api.anthropic.com";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const proxyKey = request.headers.get("x-proxy-key");
    if (!proxyKey || proxyKey !== env.PROXY_KEY) {
      return new Response("forbidden", { status: 403 });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith("/v1/")) {
      return new Response("not found", { status: 404 });
    }

    const upstream = new Request(UPSTREAM + url.pathname + url.search, request);
    upstream.headers.delete("x-proxy-key");
    upstream.headers.set("x-api-key", env.ANTHROPIC_API_KEY);
    upstream.headers.delete("authorization");

    return fetch(upstream);
  },
};
