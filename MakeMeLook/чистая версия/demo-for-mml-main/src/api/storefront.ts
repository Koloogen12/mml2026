import type {
  StorefrontProductListResponse,
  StorefrontProductDetail,
  StorefrontCategoriesResponse,
  StorefrontListParams,
} from '@/types/product';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.makemeelook.ai';
const PROJECT_ID = import.meta.env.VITE_PROJECT_ID || '';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json();
}

export async function fetchProducts(params?: StorefrontListParams): Promise<StorefrontProductListResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return apiFetch(`/api/storefront/v1/${PROJECT_ID}/products${qs ? `?${qs}` : ''}`);
}

export async function fetchProduct(publicId: string): Promise<StorefrontProductDetail> {
  return apiFetch(`/api/storefront/v1/${PROJECT_ID}/products/${publicId}`);
}

export async function fetchCategories(): Promise<StorefrontCategoriesResponse> {
  return apiFetch(`/api/storefront/v1/${PROJECT_ID}/categories`);
}
