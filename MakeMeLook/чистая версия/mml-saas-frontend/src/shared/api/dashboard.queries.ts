import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './projects';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recent: () => [...dashboardKeys.all, 'recent'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardApi.getStats(),
    select: (data) => ({
      totalProjects: data.total_projects,
      totalLeads: data.total_leads,
      leadsTrend: data.leads_trend,
      conversionRate: data.conversion_rate,
      conversionRateTrend: data.conversion_rate_trend,
      activeWidgets: data.active_widgets,
    }),
  });
}

export function useRecentProjects() {
  return useQuery({
    queryKey: dashboardKeys.recent(),
    queryFn: () => dashboardApi.getRecentProjects(),
  });
}
