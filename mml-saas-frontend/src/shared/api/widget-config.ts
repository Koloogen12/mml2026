import { apiClient } from './client';
import type { WidgetConfig } from '@/pages/projects/[id]/widget/types';

// ─── Response types ──────────────────────────────────────────────────────────

export interface WidgetConfigResponse extends WidgetConfig {
  id: number;
  project_id: number;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PresetPreviewColors {
  accent: string;
  bg: string;
  text: string;
}

export interface PresetConfigPartial {
  color_mode: string;
  accent_color: string;
  accent_text_color: string;
  bg_color: string;
  text_color: string;
  secondary_text_color: string;
  font_family: string;
  border_radius: number;
  button_bg_color: string;
  button_icon_color: string;
  button_type: string;
  button_shadow: boolean;
  button_animation: string;
}

export interface PresetResponse {
  id: string;
  name: string;
  description: string;
  preview_colors: PresetPreviewColors;
  config: PresetConfigPartial;
}

// ─── API client ──────────────────────────────────────────────────────────────

export const widgetConfigApi = {
  get: async (projectId: number): Promise<WidgetConfigResponse> => {
    const response = await apiClient.get<WidgetConfigResponse>(
      `/api/v1/projects/${projectId}/widget-config`,
    );
    return response.data;
  },

  update: async (
    projectId: number,
    data: Partial<WidgetConfig>,
  ): Promise<WidgetConfigResponse> => {
    const response = await apiClient.put<WidgetConfigResponse>(
      `/api/v1/projects/${projectId}/widget-config`,
      data,
    );
    return response.data;
  },

  getPresets: async (projectId: number): Promise<PresetResponse[]> => {
    const response = await apiClient.get<PresetResponse[]>(
      `/api/v1/projects/${projectId}/widget-config/presets`,
    );
    return response.data;
  },

  applyPreset: async (
    projectId: number,
    presetId: string,
  ): Promise<WidgetConfigResponse> => {
    const response = await apiClient.post<WidgetConfigResponse>(
      `/api/v1/projects/${projectId}/widget-config/apply-preset`,
      { preset_id: presetId },
    );
    return response.data;
  },

  deleteLogo: async (projectId: number): Promise<WidgetConfigResponse> => {
    const response = await apiClient.delete<WidgetConfigResponse>(
      `/api/v1/projects/${projectId}/widget-config/logo`,
    );
    return response.data;
  },

  uploadLogo: async (
    projectId: number,
    file: File,
  ): Promise<WidgetConfigResponse> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.post<WidgetConfigResponse>(
      `/api/v1/projects/${projectId}/widget-config/logo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
