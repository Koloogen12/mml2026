import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productsApi, productGroupsApi } from './products';
import type { ProductListFilter } from './products';

export const productKeys = {
  all: (projectId: number) => ['products', projectId] as const,
  lists: (projectId: number, filter: ProductListFilter = {}) =>
    [...productKeys.all(projectId), filter] as const,
  detail: (projectId: number, productId: number) =>
    [...productKeys.all(projectId), productId] as const,
  allProducts: (projectId: number) =>
    [...productKeys.all(projectId), 'all'] as const,
  groupProducts: (projectId: number, groupId: number) =>
    [...productKeys.all(projectId), 'group', groupId] as const,
};

export const groupKeys = {
  all: (projectId: number) => ['groups', projectId] as const,
};

export function useProducts(projectId: number, filter: ProductListFilter = {}) {
  return useQuery({
    queryKey: productKeys.lists(projectId, filter),
    queryFn: () => productsApi.list(projectId, filter),
    placeholderData: keepPreviousData,
    enabled: projectId > 0,
  });
}

export function useProduct(
  projectId: number,
  productId: number,
  enabled = true,
) {
  return useQuery({
    queryKey: productKeys.detail(projectId, productId),
    queryFn: () => productsApi.getById(projectId, productId),
    enabled: enabled && projectId > 0 && productId > 0,
  });
}

export function useProductGroups(projectId: number) {
  return useQuery({
    queryKey: groupKeys.all(projectId),
    queryFn: () => productGroupsApi.list(projectId),
    enabled: projectId > 0,
  });
}

export function useAllProducts(projectId: number, enabled: boolean) {
  return useQuery({
    queryKey: productKeys.allProducts(projectId),
    queryFn: () => productsApi.list(projectId, { limit: 200 }),
    enabled: enabled && projectId > 0,
  });
}

export function useGroupProducts(
  projectId: number,
  groupId: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: productKeys.groupProducts(projectId, groupId ?? 0),
    queryFn: () =>
      productsApi.list(projectId, { group_id: groupId!, limit: 200 }),
    enabled: enabled && projectId > 0 && Boolean(groupId),
  });
}
