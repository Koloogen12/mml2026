import { apiClient } from './client';

// ─── Lead types ──────────────────────────────────────────────────────────────

export interface LeadResponse {
  id: number;
  project_id: number;
  session_token: string;
  gender?: string;
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  size?: string;
  belly_shape?: string;
  figure_type?: string;
  email?: string;
  ip?: string;
  user_agent?: string;
  device_info?: Record<string, unknown>;
  first_visit_at: string;
  last_visit_at: string;
  visit_count: number;
  tryon_count: number;
  created_at: string;
  updated_at: string;
}

export interface LeadListResponse {
  leads: LeadResponse[];
  total: number;
  offset: number;
  limit: number;
}

export interface LeadListFilter {
  search?: string;
  gender?: string;
  size?: string;
  period?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface LeadPhotoResponse {
  id: number;
  public_id: string;
  url: string;
  type: string;
  created_at: string;
}

export interface LeadTryOnProductResponse {
  id: number;
  name: string;
  category?: string;
  photo_url?: string;
}

export interface LeadTryOnResponse {
  id: number;
  public_id: string;
  result_url: string;
  model_photo?: LeadPhotoResponse;
  outerwear_product?: LeadTryOnProductResponse;
  tops_product?: LeadTryOnProductResponse;
  bottoms_product?: LeadTryOnProductResponse;
  created_at: string;
}

export interface LeadFavoriteResponse {
  id: number;
  public_id: string;
  image_url: string;
  try_on_id?: number;
  created_at: string;
}

export interface LeadCartItemResponse {
  id: number;
  public_id: string;
  product: LeadTryOnProductResponse;
  try_on_id?: number;
  created_at: string;
}

export interface LeadDetailResponse extends LeadResponse {
  photos: LeadPhotoResponse[];
  try_ons: LeadTryOnResponse[];
  favorites: LeadFavoriteResponse[];
  cart_items: LeadCartItemResponse[];
}

// ─── Leads API ───────────────────────────────────────────────────────────────

export const leadsApi = {
  list: async (
    projectId: number,
    filter: LeadListFilter = {},
  ): Promise<LeadListResponse> => {
    const params: Record<string, string | number> = {};
    if (filter.search) params.search = filter.search;
    if (filter.gender) params.gender = filter.gender;
    if (filter.size) params.size = filter.size;
    if (filter.period) params.period = filter.period;
    if (filter.sort_by) params.sort_by = filter.sort_by;
    if (filter.sort_order) params.sort_order = filter.sort_order;
    if (filter.offset !== undefined) params.offset = filter.offset;
    if (filter.limit !== undefined) params.limit = filter.limit;

    const response = await apiClient.get<LeadListResponse>(
      `/api/v1/projects/${projectId}/leads`,
      { params },
    );
    return response.data;
  },

  getById: async (
    projectId: number,
    leadId: number,
  ): Promise<LeadDetailResponse> => {
    const response = await apiClient.get<LeadDetailResponse>(
      `/api/v1/projects/${projectId}/leads/${leadId}`,
    );
    return response.data;
  },

  export: async (
    projectId: number,
    filter: LeadListFilter = {},
  ): Promise<Blob> => {
    const params: Record<string, string | number> = {};
    if (filter.search) params.search = filter.search;
    if (filter.gender) params.gender = filter.gender;
    if (filter.size) params.size = filter.size;
    if (filter.period) params.period = filter.period;

    const response = await apiClient.post(
      `/api/v1/projects/${projectId}/leads/export`,
      null,
      { params, responseType: 'blob' },
    );
    return response.data as Blob;
  },
};
