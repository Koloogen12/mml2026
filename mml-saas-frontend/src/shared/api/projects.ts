import { apiClient } from './client';

export interface CreateProjectRequest {
  name: string;
  site_url: string;
  category?: string;
  target_audience: string[];
  description?: string;
  logo?: File;
}

export interface UpdateProjectRequest {
  name: string;
  site_url: string;
  category?: string;
  target_audience: string[];
  description?: string;
  logo?: File;
}

export interface ProjectResponse {
  id: number;
  public_id: string;
  name: string;
  site_url: string;
  category?: string;
  target_audience: string[];
  description?: string;
  logo_url?: string;
  status: 'draft' | 'active' | 'paused';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
  total: number;
}

export interface ProjectStatsResponse {
  try_ons: number;
  leads: number;
  conversions: number;
  conversion_rate: number;
}

export interface DashboardStatsResponse {
  total_projects: number;
  total_leads: number;
  leads_trend: number;
  conversion_rate: number;
  conversion_rate_trend: number;
  active_widgets: number;
}

export interface OnboardingStatusResponse {
  project_created: boolean;
  widget_configured: boolean;
  products_added: boolean;
  code_viewed: boolean;
  first_try_on: boolean;
}

export const projectsApi = {
  create: async (data: CreateProjectRequest): Promise<ProjectResponse> => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('site_url', data.site_url);
    if (data.category) formData.append('category', data.category);
    if (data.description) formData.append('description', data.description);
    formData.append('target_audience', JSON.stringify(data.target_audience));
    if (data.logo) formData.append('logo', data.logo);

    const response = await apiClient.post<ProjectResponse>(
      '/api/v1/projects',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  list: async (offset = 0, limit = 100): Promise<ProjectListResponse> => {
    const response = await apiClient.get<ProjectListResponse>(
      '/api/v1/projects',
      {
        params: { offset, limit },
      },
    );
    return response.data;
  },

  getById: async (id: number): Promise<ProjectResponse> => {
    const response = await apiClient.get<ProjectResponse>(
      `/api/v1/projects/${id}`,
    );
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateProjectRequest,
  ): Promise<ProjectResponse> => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('site_url', data.site_url);
    if (data.category) formData.append('category', data.category);
    if (data.description) formData.append('description', data.description);
    formData.append('target_audience', JSON.stringify(data.target_audience));
    if (data.logo) formData.append('logo', data.logo);

    const response = await apiClient.put<ProjectResponse>(
      `/api/v1/projects/${id}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/projects/${id}`);
  },

  updateStatus: async (
    id: number,
    status: 'draft' | 'active' | 'paused',
  ): Promise<ProjectResponse> => {
    const response = await apiClient.put<ProjectResponse>(
      `/api/v1/projects/${id}/status`,
      { status },
    );
    return response.data;
  },

  getStats: async (id: number): Promise<ProjectStatsResponse> => {
    const response = await apiClient.get<ProjectStatsResponse>(
      `/api/v1/projects/${id}/stats`,
    );
    return response.data;
  },

  getOnboardingStatus: async (
    id: number,
  ): Promise<OnboardingStatusResponse> => {
    const response = await apiClient.get<OnboardingStatusResponse>(
      `/api/v1/projects/${id}/onboarding`,
    );
    return response.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStatsResponse> => {
    const response = await apiClient.get<DashboardStatsResponse>(
      '/api/v1/dashboard/stats',
    );
    return response.data;
  },

  getRecentProjects: async (): Promise<ProjectResponse[]> => {
    const response = await apiClient.get<ProjectResponse[]>(
      '/api/v1/dashboard/recent-projects',
    );
    return response.data;
  },
};
