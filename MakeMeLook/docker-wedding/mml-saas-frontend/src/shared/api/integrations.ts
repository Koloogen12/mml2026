import { apiClient } from './client';

// ─── Integration types ───────────────────────────────────────────────────────

export interface EcommerceStoreResponse {
  id: number;
  project_id: number;
  platform: string;
  name: string;
  api_url: string;
  is_active: boolean;
  sync_interval: string;
  last_synced_at?: string;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface EcommerceStoreListResponse {
  stores: EcommerceStoreResponse[];
}

export interface CreateEcommerceStoreRequest {
  platform: string;
  name: string;
  api_url: string;
  api_email?: string;
  api_key: string;
  sync_interval?: string;
}

export interface UpdateEcommerceStoreRequest {
  name?: string;
  api_url?: string;
  api_email?: string;
  api_key?: string;
  is_active?: boolean;
  sync_interval?: string;
}

export interface EcommerceTestResponse {
  success: boolean;
  products_count: number;
  message: string;
}

export interface EcommerceSyncStatusResponse {
  store_id: number;
  status: string;
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  error_messages: string[];
}

export interface StoreCategoryResponse {
  id: number;
  store_id: number;
  external_id: string;
  name: string;
  parent_name?: string;
  full_path?: string;
}

export interface StoreCategoryListResponse {
  categories: StoreCategoryResponse[];
}

export interface CategoryMappingResponse {
  id: number;
  store_id: number;
  store_category_id: number;
  category_name: string;
  category_path?: string;
  product_type: string;
  gender?: string;
}

export interface CategoryMappingListResponse {
  mappings: CategoryMappingResponse[];
}

export interface SaveCategoryMappingRequest {
  store_category_id: number;
  product_type: string;
  gender?: string;
}

export interface SaveCategoryMappingsRequest {
  mappings: SaveCategoryMappingRequest[];
}

// ─── Integrations API ────────────────────────────────────────────────────────

export const integrationsApi = {
  list: async (
    projectId: number,
  ): Promise<EcommerceStoreListResponse> => {
    const response = await apiClient.get<EcommerceStoreListResponse>(
      `/api/v1/projects/${projectId}/integrations`,
    );
    return response.data;
  },

  create: async (
    projectId: number,
    data: CreateEcommerceStoreRequest,
  ): Promise<EcommerceStoreResponse> => {
    const response = await apiClient.post<EcommerceStoreResponse>(
      `/api/v1/projects/${projectId}/integrations`,
      data,
    );
    return response.data;
  },

  getById: async (
    projectId: number,
    storeId: number,
  ): Promise<EcommerceStoreResponse> => {
    const response = await apiClient.get<EcommerceStoreResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}`,
    );
    return response.data;
  },

  update: async (
    projectId: number,
    storeId: number,
    data: UpdateEcommerceStoreRequest,
  ): Promise<EcommerceStoreResponse> => {
    const response = await apiClient.put<EcommerceStoreResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}`,
      data,
    );
    return response.data;
  },

  delete: async (projectId: number, storeId: number): Promise<void> => {
    await apiClient.delete(
      `/api/v1/projects/${projectId}/integrations/${storeId}`,
    );
  },

  test: async (
    projectId: number,
    storeId: number,
  ): Promise<EcommerceTestResponse> => {
    const response = await apiClient.post<EcommerceTestResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}/test`,
    );
    return response.data;
  },

  sync: async (
    projectId: number,
    storeId: number,
  ): Promise<EcommerceSyncStatusResponse> => {
    const response = await apiClient.post<EcommerceSyncStatusResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}/sync`,
    );
    return response.data;
  },

  getSyncStatus: async (
    projectId: number,
    storeId: number,
  ): Promise<EcommerceSyncStatusResponse> => {
    const response = await apiClient.get<EcommerceSyncStatusResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}/status`,
    );
    return response.data;
  },

  fetchCategories: async (
    projectId: number,
    storeId: number,
  ): Promise<StoreCategoryListResponse> => {
    const response = await apiClient.post<StoreCategoryListResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}/fetch-categories`,
    );
    return response.data;
  },

  listCategories: async (
    projectId: number,
    storeId: number,
  ): Promise<StoreCategoryListResponse> => {
    const response = await apiClient.get<StoreCategoryListResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}/categories`,
    );
    return response.data;
  },

  listMappings: async (
    projectId: number,
    storeId: number,
  ): Promise<CategoryMappingListResponse> => {
    const response = await apiClient.get<CategoryMappingListResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}/mappings`,
    );
    return response.data;
  },

  saveMappings: async (
    projectId: number,
    storeId: number,
    data: SaveCategoryMappingsRequest,
  ): Promise<CategoryMappingListResponse> => {
    const response = await apiClient.put<CategoryMappingListResponse>(
      `/api/v1/projects/${projectId}/integrations/${storeId}/mappings`,
      data,
    );
    return response.data;
  },
};
