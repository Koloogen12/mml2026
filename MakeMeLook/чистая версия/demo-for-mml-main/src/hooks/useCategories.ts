import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '@/api/storefront';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
  });
}
