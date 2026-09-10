import { initWidget } from '@/widget';
import type { SessionWithConfigResponse } from '@/types';

const USE_MOCK = import.meta.env.VITE_MOCK === 'true';
const API_BASE_URL = '';
const PROJECT_ID =
  import.meta.env.VITE_PROJECT_ID || '9b3ca54b-2503-408d-be62-ffd783ed8d20';
const S3_PROXY = import.meta.env.VITE_S3_PROXY === 'true';
const S3_TARGET = import.meta.env.VITE_S3_TARGET || 'http://127.0.0.1:9010';

// Rewrite MinIO URLs to go through Vite proxy (only in development-minio mode)
function rewriteMinioUrls(data: SessionWithConfigResponse) {
  if (!S3_PROXY) return;
  const rewrite = (url: string | null) =>
    url ? url.replace(S3_TARGET, '/s3') : url;
  for (const p of data.config.products ?? []) {
    p.photo_url = rewrite(p.photo_url) ?? p.photo_url;
    p.thumbnail_url = rewrite(p.thumbnail_url) ?? p.thumbnail_url;
  }
}

async function bootstrapMock() {
  const { mockData } = await import('@/dev-mock');
  initWidget(mockData);
}

async function bootstrapApi() {
  console.log('[MML-DEV] bootstrapApi start, PROJECT_ID=', PROJECT_ID);
  const storedToken = localStorage.getItem('mml_session_token');
  console.log('[MML-DEV] storedToken=', storedToken);

  let data: SessionWithConfigResponse;

  if (storedToken) {
    try {
      const res = await fetch(`/api/widget/v1/sessions/${storedToken}`);
      if (res.ok) {
        data = await res.json();
        console.log('[MML-DEV] existing session loaded', data);
        data.config.apiBaseUrl = API_BASE_URL;
        data.config.projectId = PROJECT_ID;
        rewriteMinioUrls(data);
        initWidget(data);
        return;
      }
    } catch {
      // Session expired or invalid
    }
  }

  const res = await fetch('/api/widget/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: PROJECT_ID }),
  });

  data = await res.json();
  console.log('[MML-DEV] new session created', data);
  data.config.apiBaseUrl = API_BASE_URL;
  data.config.projectId = PROJECT_ID;
  rewriteMinioUrls(data);

  localStorage.setItem('mml_session_token', data.session_token);

  initWidget(data);
}

if (USE_MOCK) {
  bootstrapMock();
} else {
  bootstrapApi();
}
