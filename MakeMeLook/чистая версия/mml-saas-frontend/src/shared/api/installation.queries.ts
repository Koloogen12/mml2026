import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { installationApi } from './installation';

export const installationKeys = {
  all: ['installation'] as const,
  widgetCode: (projectId: number) =>
    [...installationKeys.all, projectId, 'widget-code'] as const,
  readiness: (projectId: number) =>
    [...installationKeys.all, projectId, 'readiness'] as const,
  diagnostics: (projectId: number) =>
    [...installationKeys.all, projectId, 'diagnostics'] as const,
};

export function useWidgetCode(projectId: number, enabled = true) {
  return useQuery({
    queryKey: installationKeys.widgetCode(projectId),
    queryFn: () => installationApi.getWidgetCode(projectId),
    enabled: enabled && projectId > 0,
  });
}

export function useReadiness(projectId: number, enabled = true) {
  return useQuery({
    queryKey: installationKeys.readiness(projectId),
    queryFn: () => installationApi.getReadiness(projectId),
    enabled: enabled && projectId > 0,
  });
}

export function useDiagnostics(projectId: number, enabled = true) {
  return useQuery({
    queryKey: installationKeys.diagnostics(projectId),
    queryFn: () => installationApi.getDiagnostics(projectId),
    enabled: enabled && projectId > 0,
  });
}

export function useRunDiagnostics(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => installationApi.runDiagnostics(projectId),
    onSuccess: (data) => {
      queryClient.setQueryData(installationKeys.diagnostics(projectId), data);
    },
  });
}
