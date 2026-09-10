import type {
  StorefrontProductListResponse,
  StorefrontProductDetail,
  StorefrontCategoriesResponse,
  StorefrontListParams,
} from '../_types/product';

// Каталог демо-магазина берётся через живой домен витрины: Caddy уводит
// /api/storefront/* в бэкенд виджета. Так магазин не зависит от того, куда
// сейчас смотрят DNS поддоменов .tech.
const API_BASE = 'https://makemelook.ai';
const PROJECT_ID = '7ad27409-5573-4312-89ec-a4823324feaa';

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
