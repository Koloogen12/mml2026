import { apiClient } from './client';

// ─── Product types ────────────────────────────────────────────────────────────

export interface ProductPhotoResponse {
  id: number;
  url: string;
  sort_order: number;
}

export interface ProductResponse {
  id: number;
  public_id: string;
  project_id: number;
  name: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  sku?: string;
  price?: number;
  discount_price?: number;
  currency?: string;
  product_url?: string;
  season: string[];
  color?: string;
  material?: string;
  brand?: string;
  sizes: string[];
  description?: string;
  is_active: boolean;
  source: string;
  photos: ProductPhotoResponse[];
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  products: ProductResponse[];
  total: number;
  offset: number;
  limit: number;
}

export interface ProductListFilter {
  search?: string;
  category?: string;
  gender?: string;
  group_id?: number;
  status?: 'active' | 'inactive';
  offset?: number;
  limit?: number;
}

export interface CreateProductRequest {
  name: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  sku?: string;
  price?: number;
  discount_price?: number;
  currency?: string;
  product_url?: string;
  season?: string[];
  color?: string;
  material?: string;
  brand?: string;
  sizes?: string[];
  description?: string;
  // Ordered list of pre-uploaded photo IDs. null/absent = don't touch; [] = clear all.
  photo_ids?: number[];
}

export interface BulkProductActionRequest {
  product_ids: number[];
  action: 'activate' | 'deactivate' | 'delete' | 'add_to_group';
  group_id?: number;
}

export interface BulkActionResponse {
  affected: number;
  message: string;
}

export interface PhotoOrderItem {
  id: number;
  sort_order: number;
}

// ─── Import types ─────────────────────────────────────────────────────────────

export interface ImportRowPreview {
  row: number;
  name: string;
  sku?: string;
  category?: string;
  gender?: string;
  price?: number;
  image_urls: string[];
  is_valid: boolean;
  warnings: string[];
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportValidateResponse {
  valid_count: number;
  error_count: number;
  warn_count: number;
  preview: ImportRowPreview[];
  errors: ImportRowError[];
}

export interface ImportExecuteResponse {
  import_id: string;
  total: number;
  message: string;
}

export interface ImportStatusResponse {
  import_id: string;
  status: string;
  total: number;
  processed: number;
  photos_total: number;
  photos_done: number;
  errors: string[];
  completed_at?: string;
}

export interface ParseHeadersResponse {
  headers: string[];
  sample_rows: string[][];
  detected_delimiter: string;
}

// ─── Product Group types ──────────────────────────────────────────────────────

export interface ProductGroupResponse {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  is_permanent: boolean;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductGroupListResponse {
  groups: ProductGroupResponse[];
}

export interface CreateProductGroupRequest {
  name: string;
  description?: string;
  is_active: boolean;
  product_ids?: number[];
}

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  list: async (
    projectId: number,
    filter: ProductListFilter = {},
  ): Promise<ProductListResponse> => {
    const params: Record<string, string | number> = {};
    if (filter.search) params.search = filter.search;
    if (filter.category) params.category = filter.category;
    if (filter.gender) params.gender = filter.gender;
    if (filter.group_id) params.group_id = filter.group_id;
    if (filter.status) params.status = filter.status;
    if (filter.offset !== undefined) params.offset = filter.offset;
    if (filter.limit !== undefined) params.limit = filter.limit;

    const response = await apiClient.get<ProductListResponse>(
      `/api/v1/projects/${projectId}/products`,
      { params },
    );
    return response.data;
  },

  getById: async (
    projectId: number,
    productId: number,
  ): Promise<ProductResponse> => {
    const response = await apiClient.get<ProductResponse>(
      `/api/v1/projects/${projectId}/products/${productId}`,
    );
    return response.data;
  },

  create: async (
    projectId: number,
    data: CreateProductRequest,
  ): Promise<ProductResponse> => {
    const response = await apiClient.post<ProductResponse>(
      `/api/v1/projects/${projectId}/products`,
      data,
    );
    return response.data;
  },

  update: async (
    projectId: number,
    productId: number,
    data: CreateProductRequest,
  ): Promise<ProductResponse> => {
    const response = await apiClient.put<ProductResponse>(
      `/api/v1/projects/${projectId}/products/${productId}`,
      data,
    );
    return response.data;
  },

  delete: async (projectId: number, productId: number): Promise<void> => {
    await apiClient.delete(
      `/api/v1/projects/${projectId}/products/${productId}`,
    );
  },

  bulkAction: async (
    projectId: number,
    data: BulkProductActionRequest,
  ): Promise<BulkActionResponse> => {
    const response = await apiClient.post<BulkActionResponse>(
      `/api/v1/projects/${projectId}/products/bulk`,
      data,
    );
    return response.data;
  },

  // Upload a photo before product creation; returns {id, url} to use in photo_ids.
  uploadProjectPhoto: async (
    projectId: number,
    photo: File,
  ): Promise<ProductPhotoResponse> => {
    const formData = new FormData();
    formData.append('photo', photo);
    const response = await apiClient.post<ProductPhotoResponse>(
      `/api/v1/projects/${projectId}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  uploadPhoto: async (
    projectId: number,
    productId: number,
    photo: File,
  ): Promise<ProductPhotoResponse> => {
    const formData = new FormData();
    formData.append('photo', photo);
    const response = await apiClient.post<ProductPhotoResponse>(
      `/api/v1/projects/${projectId}/products/${productId}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  deletePhoto: async (
    projectId: number,
    productId: number,
    photoId: number,
  ): Promise<void> => {
    await apiClient.delete(
      `/api/v1/projects/${projectId}/products/${productId}/photos/${photoId}`,
    );
  },

  reorderPhotos: async (
    projectId: number,
    productId: number,
    orders: PhotoOrderItem[],
  ): Promise<void> => {
    await apiClient.put(
      `/api/v1/projects/${projectId}/products/${productId}/photos/reorder`,
      { orders },
    );
  },

  // ─── Import ───────────────────────────────────────────────────────────────

  getImportTemplate: async (projectId: number): Promise<Blob> => {
    const response = await apiClient.get(
      `/api/v1/projects/${projectId}/products/import/template`,
      { responseType: 'blob' },
    );
    return response.data as Blob;
  },

  parseHeaders: async (
    projectId: number,
    file: File,
    delimiter?: string,
  ): Promise<ParseHeadersResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (delimiter) formData.append('delimiter', delimiter);
    const response = await apiClient.post<ParseHeadersResponse>(
      `/api/v1/projects/${projectId}/products/import/parse-headers`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  validateImport: async (
    projectId: number,
    file: File,
    delimiter?: string,
    mapping?: Record<string, string>,
  ): Promise<ImportValidateResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (delimiter) formData.append('delimiter', delimiter);
    if (mapping) formData.append('mapping', JSON.stringify(mapping));
    const response = await apiClient.post<ImportValidateResponse>(
      `/api/v1/projects/${projectId}/products/import/validate`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  executeImport: async (
    projectId: number,
    file: File,
    duplicateHandling: 'skip' | 'update',
    delimiter?: string,
    mapping?: Record<string, string>,
  ): Promise<ImportExecuteResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('duplicate_handling', duplicateHandling);
    if (delimiter) formData.append('delimiter', delimiter);
    if (mapping) formData.append('mapping', JSON.stringify(mapping));
    const response = await apiClient.post<ImportExecuteResponse>(
      `/api/v1/projects/${projectId}/products/import/execute`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  getImportStatus: async (
    projectId: number,
    importId: string,
  ): Promise<ImportStatusResponse> => {
    const response = await apiClient.get<ImportStatusResponse>(
      `/api/v1/projects/${projectId}/products/import/${importId}/status`,
    );
    return response.data;
  },
};

// ─── Product Groups API ───────────────────────────────────────────────────────

export const productGroupsApi = {
  list: async (projectId: number): Promise<ProductGroupListResponse> => {
    const response = await apiClient.get<ProductGroupListResponse>(
      `/api/v1/projects/${projectId}/product-groups`,
    );
    return response.data;
  },

  create: async (
    projectId: number,
    data: CreateProductGroupRequest,
  ): Promise<ProductGroupResponse> => {
    const response = await apiClient.post<ProductGroupResponse>(
      `/api/v1/projects/${projectId}/product-groups`,
      data,
    );
    return response.data;
  },

  update: async (
    projectId: number,
    groupId: number,
    data: CreateProductGroupRequest,
  ): Promise<ProductGroupResponse> => {
    const response = await apiClient.put<ProductGroupResponse>(
      `/api/v1/projects/${projectId}/product-groups/${groupId}`,
      data,
    );
    return response.data;
  },

  delete: async (projectId: number, groupId: number): Promise<void> => {
    await apiClient.delete(
      `/api/v1/projects/${projectId}/product-groups/${groupId}`,
    );
  },

  addProducts: async (
    projectId: number,
    groupId: number,
    productIds: number[],
  ): Promise<void> => {
    await apiClient.post(
      `/api/v1/projects/${projectId}/product-groups/${groupId}/products`,
      { product_ids: productIds },
    );
  },

  removeProduct: async (
    projectId: number,
    groupId: number,
    productId: number,
  ): Promise<void> => {
    await apiClient.delete(
      `/api/v1/projects/${projectId}/product-groups/${groupId}/products/${productId}`,
    );
  },
};
