import { useQuery } from '@tanstack/react-query';
import { projectsApi } from './projects';
import { domainsApi } from './domains';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: number) => [...projectKeys.all, id] as const,
  onboarding: (id: number) =>
    [...projectKeys.detail(id), 'onboarding'] as const,
  stats: (id: number) => [...projectKeys.detail(id), 'stats'] as const,
  domains: (id: number) => [...projectKeys.detail(id), 'domains'] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => projectsApi.list(),
  });
}

export function useProject(id: number, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: enabled && id > 0,
  });
}

export function useProjectOnboarding(id: number, enabled = true) {
  return useQuery({
    queryKey: projectKeys.onboarding(id),
    queryFn: () => projectsApi.getOnboardingStatus(id),
    enabled: enabled && id > 0,
  });
}

export function useProjectStats(id: number, enabled = true) {
  return useQuery({
    queryKey: projectKeys.stats(id),
    queryFn: () => projectsApi.getStats(id),
    enabled: enabled && id > 0,
  });
}

export function useProjectDomains(id: number, enabled = true) {
  return useQuery({
    queryKey: projectKeys.domains(id),
    queryFn: () => domainsApi.list(id),
    enabled: enabled && id > 0,
  });
}
