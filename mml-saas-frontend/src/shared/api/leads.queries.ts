import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { leadsApi } from './leads';
import type { LeadListFilter } from './leads';

export const leadKeys = {
  all: (projectId: number) => ['leads', projectId] as const,
  lists: (projectId: number, filter: LeadListFilter = {}) =>
    [...leadKeys.all(projectId), filter] as const,
  detail: (projectId: number, leadId: number) =>
    [...leadKeys.all(projectId), leadId] as const,
};

export function useLeads(projectId: number, filter: LeadListFilter = {}) {
  return useQuery({
    queryKey: leadKeys.lists(projectId, filter),
    queryFn: () => leadsApi.list(projectId, filter),
    placeholderData: keepPreviousData,
    enabled: projectId > 0,
  });
}

export function useLead(projectId: number, leadId: number) {
  return useQuery({
    queryKey: leadKeys.detail(projectId, leadId),
    queryFn: () => leadsApi.getById(projectId, leadId),
    enabled: projectId > 0 && leadId > 0,
  });
}
