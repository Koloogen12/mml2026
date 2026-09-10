import { apiClient } from './client';

export interface DomainResponse {
  id: number;
  domain: string;
  is_verified: boolean;
  verified_at?: string;
}

export interface DomainsListResponse {
  domains: DomainResponse[];
}

export const domainsApi = {
  list: async (projectId: number): Promise<DomainResponse[]> => {
    const response = await apiClient.get<DomainsListResponse>(
      `/api/v1/projects/${projectId}/domains`,
    );
    return response.data.domains;
  },

  add: async (projectId: number, domain: string): Promise<DomainResponse> => {
    const response = await apiClient.post<DomainResponse>(
      `/api/v1/projects/${projectId}/domains`,
      { domain },
    );
    return response.data;
  },

  delete: async (projectId: number, domainId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/projects/${projectId}/domains/${domainId}`);
  },
};
