import axios from 'axios';
import type {
  SessionResponse,
  SessionWithConfigResponse,
  UploadPhotoResponse,
  TryOnAcceptedResponse,
  TryOnStatusResponse,
  TryOnHistoryItem,
  AvatarItem,
  FavoriteItem,
  CartItemResponse,
} from '@/types';

let apiClient = axios.create();

export function getApiBaseUrl(): string {
  // For OAuth popups we need the real backend URL, not the proxy.
  // In dev mode baseURL is empty (Vite proxy), so fall back to the backend directly.
  return apiClient.defaults.baseURL || (import.meta.env.VITE_API_TARGET as string) || 'http://localhost:3010';
}

export function initApi(baseUrl: string) {
  apiClient = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function getApiClient() {
  return apiClient;
}

// --- Sessions ---

// Returns session + widget config. Used by the store for 404 recovery after body params sync fails.
export async function createSession(
  projectId: string,
): Promise<SessionWithConfigResponse> {
  const { data } = await apiClient.post('/api/widget/v1/sessions', {
    project_id: projectId,
  });
  return data;
}

export async function updateSession(
  token: string,
  params: Record<string, unknown>,
): Promise<SessionResponse> {
  const { data } = await apiClient.put(
    `/api/widget/v1/sessions/${token}`,
    params,
  );
  return data;
}

// --- Photos ---

export async function uploadPhoto(
  token: string,
  file: File,
  opts?: { force?: boolean },
): Promise<UploadPhotoResponse> {
  const formData = new FormData();
  formData.append('photo', file);
  // ?force=true bypasses the backend's strict photo validator. Used only
  // when the user clicks "Try anyway" on the rejection screen after a
  // first attempt was rejected — the backend logs the override in
  // Telegram so we can audit force-overridden try-on quality.
  const qs = opts?.force ? '?force=true' : '';
  const { data } = await apiClient.post(
    `/api/widget/v1/sessions/${token}/photos${qs}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 },
  );
  return data;
}

// Shape of the 422 response body returned by the photo upload handler when
// the backend's strict photo validator rejects an upload (see
// internal/handler/widget_session.go::UploadPhoto). Distinct from generic
// network/HTTP errors — the widget shows a localised reject screen instead
// of a toast when this code is present.
export interface PhotoRejectionError {
  reason: string;
  message: string;
  photoUrl?: string;
  objectKey?: string;
}

// --- Try-on ---

export async function requestTryOn(
  token: string,
  modelPhotoId: string,
  productIds: string[],
): Promise<TryOnAcceptedResponse> {
  const { data } = await apiClient.post(
    `/api/widget/v1/sessions/${token}/tryon`,
    { model_photo_id: modelPhotoId, product_ids: productIds },
    { timeout: 30000 },
  );
  console.log('[MML] tryon accepted', data);
  return data;
}

export async function getTryOnStatus(
  token: string,
  tryOnPublicId: string,
): Promise<TryOnStatusResponse> {
  const { data } = await apiClient.get(
    `/api/widget/v1/sessions/${token}/tryon/${tryOnPublicId}/status`,
    { timeout: 10000 },
  );
  return data;
}

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 360000;

export function pollTryOnResult(
  token: string,
  tryOnPublicId: string,
  signal?: AbortSignal,
): Promise<TryOnStatusResponse> {
  console.log('[MML] poll start', tryOnPublicId);
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tick = async () => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      if (Date.now() - start > POLL_TIMEOUT) {
        reject(new Error('Try-on polling timeout'));
        return;
      }
      try {
        console.log('[MML] poll tick', tryOnPublicId);
        const status = await getTryOnStatus(token, tryOnPublicId);
        console.log('[MML] poll status', status);
        if (status.status === 'done') {
          resolve(status);
          return;
        }
        if (status.status === 'error') {
          reject(new Error('Try-on generation failed'));
          return;
        }
      } catch (e) {
        console.warn('[MML] poll tick error', e);
      }
      setTimeout(tick, POLL_INTERVAL);
    };

    tick();
  });
}

export async function getTryOnHistory(
  token: string,
): Promise<TryOnHistoryItem[]> {
  const { data } = await apiClient.get(
    `/api/widget/v1/sessions/${token}/tryon-history`,
  );
  return data;
}

// --- Avatars ---

export async function listAvatars(gender?: string): Promise<AvatarItem[]> {
  const params = gender ? { gender } : {};
  const { data } = await apiClient.get('/api/widget/v1/avatars', { params });
  return data;
}

export async function matchAvatars(params: {
  gender: string;
  height: number;
  weight: number;
  figure_type?: string;
}): Promise<AvatarItem[]> {
  const { data } = await apiClient.get('/api/widget/v1/avatars/match', {
    params,
  });
  return data;
}

// --- Favorites ---

export async function addFavorite(
  token: string,
  imageKey: string,
  tryOnId?: string,
): Promise<FavoriteItem> {
  const { data } = await apiClient.post(
    `/api/widget/v1/sessions/${token}/favorites`,
    { image_key: imageKey, try_on_id: tryOnId },
  );
  return data;
}

export async function listFavorites(token: string): Promise<FavoriteItem[]> {
  const { data } = await apiClient.get(
    `/api/widget/v1/sessions/${token}/favorites`,
  );
  return data;
}

export async function deleteFavorite(token: string, id: string): Promise<void> {
  await apiClient.delete(`/api/widget/v1/sessions/${token}/favorites/${id}`);
}

// --- Cart ---

export async function addCartItem(
  token: string,
  productId: string,
  tryOnId?: string,
): Promise<CartItemResponse> {
  const { data } = await apiClient.post(
    `/api/widget/v1/sessions/${token}/cart`,
    { product_id: productId, try_on_id: tryOnId },
  );
  return data;
}

export async function listCartItems(
  token: string,
): Promise<CartItemResponse[]> {
  const { data } = await apiClient.get(`/api/widget/v1/sessions/${token}/cart`);
  return data;
}

export async function deleteCartItem(token: string, id: string): Promise<void> {
  await apiClient.delete(`/api/widget/v1/sessions/${token}/cart/${id}`);
}

// --- Size Recommendation ---

export interface SizeRecommendationResponse {
  recommended_size: string;
  confidence: 'high' | 'medium' | 'low';
  sizes: Array<{ size: string; score: number; fit: 'perfect' | 'good' | 'tight' | 'loose' }> | null;
  // True when the user's measurements are outside the product's size
  // chart entirely — widget should warn the buyer that the recommendation
  // is a best-effort guess rather than a guaranteed fit.
  out_of_chart?: boolean;
}

export async function recommendSize(
  sessionToken: string,
  productId: string,
): Promise<SizeRecommendationResponse> {
  const { data } = await apiClient.post('/api/widget/v1/recommend-size', {
    session_token: sessionToken,
    product_id: productId,
  });
  return data;
}

// --- Events ---

export async function trackEvents(
  sessionToken: string,
  projectId: string,
  events: Array<{
    event_type: string;
    event_data?: Record<string, unknown>;
    page_url?: string;
  }>,
): Promise<void> {
  await apiClient.post('/api/widget/v1/events', {
    session_token: sessionToken,
    project_id: projectId,
    events,
  });
}

// --- Consent (biometric personal data per 152-ФЗ ст. 11) ---

export async function recordConsent(
  token: string,
  policyType: string,
  policyVersion: string,
  locale: string,
): Promise<void> {
  await apiClient.post(`/api/widget/v1/sessions/${token}/consent`, {
    policy_type: policyType,
    policy_version: policyVersion,
    locale,
  });
}

// --- Share ---

export function getShareUrl(tryOnPublicId: string): string {
  const base = apiClient.defaults.baseURL || '';
  return `${base}/api/widget/v1/share/${tryOnPublicId}`;
}

// --- Auth ---

export async function sendAuthCode(
  token: string,
  contact: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(
    `/api/widget/v1/sessions/${token}/auth/send-code`,
    { contact },
  );
  return data;
}

export async function verifyAuthCode(
  token: string,
  contact: string,
  code: string,
): Promise<{ success: boolean; is_authenticated: boolean; email?: string; phone?: string }> {
  const { data } = await apiClient.post(
    `/api/widget/v1/sessions/${token}/auth/verify`,
    { contact, code },
  );
  return data;
}
