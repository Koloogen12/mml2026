import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../_api/storefront';
import type { StorefrontListParams } from '../_types/product';

export function useProducts(params?: StorefrontListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    staleTime: 5 * 60 * 1000,
  });
}

