// MML Telegram API mirror — Cloudflare Worker
//
// Forwards every request to https://api.telegram.org with the same path,
// query, method, headers and body. Use it as TELEGRAM_API_BASE_URL on the
// backend (RU networks block api.telegram.org directly; this Worker has
// free egress).
//
// Deploy:
//   1. dash.cloudflare.com → Workers & Pages → Create → Hello World
//   2. Quick edit → paste this file → Save and Deploy
//   3. The Worker URL (e.g. https://mml-tg-proxy.<account>.workers.dev) goes
//      into TELEGRAM_API_BASE_URL on the backend .env
//
// Free tier: 100k requests/day. We currently make ~5/min = ~7k/day, so this
// is comfortably under the limit.
//
// Security note: this Worker is publicly callable, but every Telegram API
// request requires the bot token in the URL path. Anyone hitting the Worker
// without the right token gets a 401 from Telegram, exactly the same as
// hitting api.telegram.org directly. No additional auth is needed.

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const upstream = new URL("https://api.telegram.org" + incoming.pathname + incoming.search);

    // Strip CF-injected headers that confuse origins; keep everything else
    // (Authorization, Content-Type, Content-Length, etc.).
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");
    headers.delete("x-forwarded-for");
    headers.delete("x-forwarded-proto");
    headers.delete("x-real-ip");

    // For non-GET/HEAD requests, stream the body through unchanged. This
    // matters for sendPhoto (multipart/form-data with binary image bytes)
    // because reading + re-serialising would corrupt the multipart boundary.
    const init = {
      method: request.method,
      headers,
      // Workers automatically streams when body is a ReadableStream. For
      // GET/HEAD, body must be null.
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "follow",
    };

    // Workers requires explicit duplex for streaming bodies in newer runtimes.
    if (init.body) {
      init.duplex = "half";
    }

    try {
      const upstreamResp = await fetch(upstream.toString(), init);
      // Pass response straight back. Telegram already sets Content-Type
      // (application/json) and CORS headers as needed.
      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        statusText: upstreamResp.statusText,
        headers: upstreamResp.headers,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 502,
          description: `tg-mirror upstream fetch failed: ${err.message}`,
        }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }
  },
};
