import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics';

export const analyticsKeys = {
  all: (projectId: number) => ['analytics', projectId] as const,
  summary: (projectId: number, period: string) =>
    [...analyticsKeys.all(projectId), 'summary', period] as const,
  funnel: (projectId: number, period: string) =>
    [...analyticsKeys.all(projectId), 'funnel', period] as const,
  trends: (projectId: number, period: string, metric: string) =>
    [...analyticsKeys.all(projectId), 'trends', period, metric] as const,
  topProducts: (projectId: number, period: string, sortBy: string) =>
    [...analyticsKeys.all(projectId), 'top-products', period, sortBy] as const,
  audience: (projectId: number, period: string) =>
    [...analyticsKeys.all(projectId), 'audience', period] as const,
};

export function useAnalyticsSummary(projectId: number, period: string) {
  return useQuery({
    queryKey: analyticsKeys.summary(projectId, period),
    queryFn: () => analyticsApi.getSummary(projectId, period),
    enabled: projectId > 0,
  });
}

export function useAnalyticsFunnel(projectId: number, period: string) {
  return useQuery({
    queryKey: analyticsKeys.funnel(projectId, period),
    queryFn: () => analyticsApi.getFunnel(projectId, period),
    enabled: projectId > 0,
  });
}

export function useAnalyticsTrends(
  projectId: number,
  period: string,
  metric: string,
) {
  return useQuery({
    queryKey: analyticsKeys.trends(projectId, period, metric),
    queryFn: () => analyticsApi.getTrends(projectId, period, metric),
    enabled: projectId > 0,
  });
}

export function useAnalyticsTopProducts(
  projectId: number,
  period: string,
  sortBy: string,
) {
  return useQuery({
    queryKey: analyticsKeys.topProducts(projectId, period, sortBy),
    queryFn: () => analyticsApi.getTopProducts(projectId, period, sortBy),
    enabled: projectId > 0,
  });
}

export function useAnalyticsAudience(projectId: number, period: string) {
  return useQuery({
    queryKey: analyticsKeys.audience(projectId, period),
    queryFn: () => analyticsApi.getAudience(projectId, period),
    enabled: projectId > 0,
  });
}
