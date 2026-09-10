import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetConfigApi } from './widget-config';
import type { WidgetConfig } from '@/pages/projects/[id]/widget/types';

export const widgetConfigKeys = {
  all: ['widget-config'] as const,
  detail: (projectId: number) => [...widgetConfigKeys.all, projectId] as const,
  presets: (projectId: number) =>
    [...widgetConfigKeys.all, projectId, 'presets'] as const,
};

export function useWidgetConfig(projectId: number, enabled = true) {
  return useQuery({
    queryKey: widgetConfigKeys.detail(projectId),
    queryFn: () => widgetConfigApi.get(projectId),
    enabled: enabled && projectId > 0,
  });
}

export function useWidgetConfigPresets(projectId: number, enabled = true) {
  return useQuery({
    queryKey: widgetConfigKeys.presets(projectId),
    queryFn: () => widgetConfigApi.getPresets(projectId),
    enabled: enabled && projectId > 0,
  });
}

export function useUpdateWidgetConfig(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<WidgetConfig>) =>
      widgetConfigApi.update(projectId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(widgetConfigKeys.detail(projectId), data);
    },
  });
}

export function useApplyPreset(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (presetId: string) =>
      widgetConfigApi.applyPreset(projectId, presetId),
    onSuccess: (data) => {
      queryClient.setQueryData(widgetConfigKeys.detail(projectId), data);
    },
  });
}

export function useDeleteWidgetLogo(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => widgetConfigApi.deleteLogo(projectId),
    onSuccess: (data) => {
      queryClient.setQueryData(widgetConfigKeys.detail(projectId), data);
    },
  });
}

export function useUploadWidgetLogo(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => widgetConfigApi.uploadLogo(projectId, file),
    onSuccess: (data) => {
      queryClient.setQueryData(widgetConfigKeys.detail(projectId), data);
    },
  });
}
