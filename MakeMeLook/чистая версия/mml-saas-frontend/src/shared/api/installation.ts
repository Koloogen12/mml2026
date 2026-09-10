import { apiClient } from './client';

export interface WidgetCodeResponse {
  snippet: string;
  project_id: string;
  cdn_url: string;
}

export interface ReadinessResponse {
  widget_configured: boolean;
  products_count: number;
  active_products: number;
  has_domain: boolean;
  all_ready: boolean;
}

export interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'pending';
  message: string;
  detail?: string;
}

export interface DomainDiagnostics {
  domain: string;
  checked_at: string | null;
  status: 'pending' | 'ok' | 'warning' | 'error';
  checks: DiagnosticCheck[];
}

export interface DiagnosticsResponse {
  domains: DomainDiagnostics[];
}

export const installationApi = {
  getWidgetCode: async (projectId: number): Promise<WidgetCodeResponse> => {
    const response = await apiClient.get<WidgetCodeResponse>(
      `/api/v1/projects/${projectId}/widget-code`,
    );
    return response.data;
  },

  getReadiness: async (projectId: number): Promise<ReadinessResponse> => {
    const response = await apiClient.get<ReadinessResponse>(
      `/api/v1/projects/${projectId}/installation/readiness`,
    );
    return response.data;
  },

  runDiagnostics: async (projectId: number): Promise<DiagnosticsResponse> => {
    const response = await apiClient.post<DiagnosticsResponse>(
      `/api/v1/projects/${projectId}/diagnostics/run`,
    );
    return response.data;
  },

  getDiagnostics: async (projectId: number): Promise<DiagnosticsResponse> => {
    const response = await apiClient.get<DiagnosticsResponse>(
      `/api/v1/projects/${projectId}/diagnostics`,
    );
    return response.data;
  },

  downloadCSCartAddon: async (projectId: number): Promise<void> => {
    try {
      const response = await apiClient.get(
        `/api/v1/projects/${projectId}/addons/cscart`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'makemelook.tgz';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      throw new Error('Failed to download CS-Cart addon');
    }
  },
};
