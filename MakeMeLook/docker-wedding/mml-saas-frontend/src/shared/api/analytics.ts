import { apiClient } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnalyticsKPI {
  value: number;
  trend: number;
}

export interface AnalyticsSummary {
  views: AnalyticsKPI;
  opens: AnalyticsKPI;
  tryons: AnalyticsKPI;
  leads: AnalyticsKPI;
  conversion: AnalyticsKPI;
  cart_items: AnalyticsKPI;
  revenue: AnalyticsKPI;
  aov: AnalyticsKPI;
}

export interface FunnelStage {
  key: string;
  count: number;
  pct: number;
}

export interface AnalyticsFunnel {
  stages: FunnelStage[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface AnalyticsTrends {
  metric: string;
  points: TrendPoint[];
}

export interface TopProduct {
  product_id: number;
  name: string;
  photo_url: string;
  tryons: number;
  favorites: number;
  cart: number;
}

export interface AnalyticsTopProducts {
  sort_by: string;
  products: TopProduct[];
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface AnalyticsAudience {
  gender: DistributionItem[];
  sizes: DistributionItem[];
  figure_types: DistributionItem[];
  devices: DistributionItem[];
}

// ─── API ────────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getSummary: async (
    projectId: number,
    period: string,
  ): Promise<AnalyticsSummary> => {
    const response = await apiClient.get<AnalyticsSummary>(
      `/api/v1/projects/${projectId}/analytics/summary`,
      { params: { period } },
    );
    return response.data;
  },

  getFunnel: async (
    projectId: number,
    period: string,
  ): Promise<AnalyticsFunnel> => {
    const response = await apiClient.get<AnalyticsFunnel>(
      `/api/v1/projects/${projectId}/analytics/funnel`,
      { params: { period } },
    );
    return response.data;
  },

  getTrends: async (
    projectId: number,
    period: string,
    metric: string,
  ): Promise<AnalyticsTrends> => {
    const response = await apiClient.get<AnalyticsTrends>(
      `/api/v1/projects/${projectId}/analytics/trends`,
      { params: { period, metric } },
    );
    return response.data;
  },

  getTopProducts: async (
    projectId: number,
    period: string,
    sortBy: string,
  ): Promise<AnalyticsTopProducts> => {
    const response = await apiClient.get<AnalyticsTopProducts>(
      `/api/v1/projects/${projectId}/analytics/top-products`,
      { params: { period, sort_by: sortBy } },
    );
    return response.data;
  },

  getAudience: async (
    projectId: number,
    period: string,
  ): Promise<AnalyticsAudience> => {
    const response = await apiClient.get<AnalyticsAudience>(
      `/api/v1/projects/${projectId}/analytics/audience`,
      { params: { period } },
    );
    return response.data;
  },
};
