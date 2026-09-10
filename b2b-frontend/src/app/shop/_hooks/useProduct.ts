import { useQuery } from '@tanstack/react-query';
import { fetchProduct } from '../_api/storefront';

export function useProduct(publicId: string | undefined) {
  return useQuery({
    queryKey: ['product', publicId],
    queryFn: () => fetchProduct(publicId!),
    enabled: !!publicId,
    staleTime: 5 * 60 * 1000,
  });
}

