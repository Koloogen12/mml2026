/**
 * MakeMeLook Widget Loader (~2KB)
 *
 * 1. Reads data-project from the <script> tag
 * 2. Checks localStorage for an existing session token
 *    - If found: GET /sessions/{token} → session + config (one request)
 *    - If not:   POST /sessions       → session + config (one request)
 * 3. Dynamically loads widget.js + widget.css
 * 4. Calls initWidget(data) with the combined session+config response
 *
 * Usage on customer site:
 * <script src="https://cdn.makemelook.ai/loader.js" data-project="PROJECT_ID"></script>
 */

// Injected at build time by Vite — no need to bump manually
declare const __BUILD_TIMESTAMP__: number;

(function () {
  // Prevent double initialization
  if ((window as unknown as Record<string, unknown>).__MML_LOADED__) return;
  (window as unknown as Record<string, unknown>).__MML_LOADED__ = true;

  const SESSION_KEY = 'mml_session_token';

  // Find our script tag
  const scripts = document.querySelectorAll('script[data-project]');
  const scriptTag = scripts[scripts.length - 1] as
    | HTMLScriptElement
    | undefined;

  if (!scriptTag) {
    console.error('[MakeMeLook] Missing data-project attribute on script tag.');
    return;
  }

  const projectId = scriptTag.getAttribute('data-project');
  if (!projectId) {
    console.error('[MakeMeLook] Empty data-project attribute.');
    return;
  }

  const apiBaseUrl =
    scriptTag.getAttribute('data-api') ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    'https://admin.makemelook.tech';
  // База ассетов — ОТДЕЛЬНАЯ настройка, а не склейка с адресом API.
  // Сегодня файлы отдаются с того же хоста, поэтому apiBaseUrl остаётся
  // запасным вариантом и поведение не меняется. Но склеенными эти два адреса
  // быть не должны: когда ассеты переедут на CDN, у клиента поменяется одна
  // строка, а не начнётся расследование, почему картинки ходят на бэкенд.
  const assetsBaseUrl =
    scriptTag.getAttribute('data-assets') ||
    (import.meta.env.VITE_ASSETS_BASE_URL as string | undefined) ||
    apiBaseUrl;
  const cdnBaseUrl =
    scriptTag.getAttribute('data-cdn') ||
    scriptTag.src.replace(/\/loader\.js.*$/, '');

  async function fetchSession(): Promise<Record<string, unknown> | null> {
    const existingToken = localStorage.getItem(SESSION_KEY);

    if (existingToken) {
      const resp = await fetch(
        `${apiBaseUrl}/api/widget/v1/sessions/${existingToken}`,
      );
      if (resp.ok) {
        return resp.json();
      }
      // Token stale or config missing — clear and create a new session
      localStorage.removeItem(SESSION_KEY);
      if (resp.status !== 404 && resp.status !== 403) {
        console.warn(`[MakeMeLook] Session fetch failed: ${resp.status}`);
      }
    }

    // Create new session
    const resp = await fetch(`${apiBaseUrl}/api/widget/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    });

    if (resp.status === 403) {
      // Domain not allowed — silently don't show the widget
      return null;
    }

    if (!resp.ok) {
      console.error(`[MakeMeLook] Session create failed: ${resp.status}`);
      return null;
    }

    return resp.json();
  }

  function detectPlatform(): string | null {
    // Tilda: pages always have div#allrecords with data-tilda-project-id
    if (document.querySelector('#allrecords[data-tilda-project-id]')) return 'tilda';
    // CS-Cart / Multi-Vendor: exposes window.Tygh, or ships ty-* body classes,
    // or a CS-Cart generator meta tag
    const w = window as unknown as Record<string, unknown>;
    if (w.Tygh) return 'cscart';
    if (document.querySelector('meta[name="generator"][content*="CS-Cart" i]')) return 'cscart';
    if (document.body && /\bty-/.test(document.body.className)) return 'cscart';
    return null;
  }

  async function load() {
    try {
      const data = await fetchSession();
      if (!data) return;

      // Persist session token from response
      if (typeof data.session_token === 'string') {
        localStorage.setItem(SESSION_KEY, data.session_token);
      }

      // Inject context into config for the widget
      const config = data.config as Record<string, unknown>;
      config.projectId = projectId;
      config.apiBaseUrl = apiBaseUrl;
      config.assetsBaseUrl = assetsBaseUrl;

      // Detect e-commerce platform for auto-injection features
      (data as Record<string, unknown>).platform = detectPlatform();

      // Cache-busting version — injected at build time by Vite (no need to update manually)
      const v = String(__BUILD_TIMESTAMP__);

      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${cdnBaseUrl}/widget.css?v=${v}`;
      document.head.appendChild(link);

      // Load widget.js
      const script = document.createElement('script');
      script.src = `${cdnBaseUrl}/widget.js?v=${v}`;
      script.onload = () => {
        const initWidget = (window as unknown as Record<string, unknown>)
          .__MML_INIT_WIDGET__ as ((data: unknown) => void) | undefined;
        if (typeof initWidget === 'function') {
          initWidget(data);
        } else {
          console.error('[MakeMeLook] Widget init function not found.');
        }
      };
      script.onerror = () => {
        console.error('[MakeMeLook] Failed to load widget.js');
      };
      document.body.appendChild(script);
    } catch (err) {
      console.error('[MakeMeLook] Loader error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
