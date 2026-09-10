export interface StorefrontPhoto {
  url: string;
  sort_order: number;
}

export interface StorefrontProduct {
  id: string; // public_id UUID
  name: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  price: number | null;
  discount_price: number | null;
  currency: string | null;
  color: string | null;
  sizes: string[];
  is_new: boolean;
  photos: StorefrontPhoto[];
}

export interface StorefrontFilters {
  categories: string[];
  brands: string[];
  colors: string[];
  price_min: number;
  price_max: number;
}

export interface StorefrontProductListResponse {
  items: StorefrontProduct[];
  total: number;
  offset: number;
  limit: number;
  filters: StorefrontFilters;
}

export interface StorefrontRelatedProduct {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  currency: string | null;
  photos: StorefrontPhoto[];
}

export interface StorefrontProductDetail extends StorefrontProduct {
  material: string | null;
  description: string | null;
  season: string[];
  related_products: StorefrontRelatedProduct[];
}

export interface StorefrontCategoryItem {
  category: string;
  count: number;
}

export interface StorefrontCategoriesResponse {
  items: StorefrontCategoryItem[];
}

export interface StorefrontListParams {
  category?: string;
  gender?: string;
  brand?: string;
  color?: string;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  group_id?: number;
  offset?: number;
  limit?: number;
}

