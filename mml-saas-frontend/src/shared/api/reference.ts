import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface ReferenceItem {
  value: string;
  label: string;
}

export interface ColorItem {
  value: string;
  hex: string;
}

export interface ReferenceData {
  genders: ReferenceItem[];
  categories: ReferenceItem[];
  product_categories: ReferenceItem[];
  sizes: string[];
  currencies: ReferenceItem[];
  seasons: ReferenceItem[];
  colors: ColorItem[];
}

async function fetchReference(): Promise<ReferenceData> {
  const response = await apiClient.get<ReferenceData>('/api/v1/reference');
  return response.data;
}

export const referenceKeys = {
  all: ['reference'] as const,
};

export function useReference() {
  return useQuery({
    queryKey: referenceKeys.all,
    queryFn: fetchReference,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
