import { useState, useMemo } from "react";
import ProductCard from "./ProductCard";
import CatalogFilters, { type FilterConfig, type ActiveFilters } from "./CatalogFilters";
import { useProducts } from "@/hooks/useProducts";
import { formatPrice } from "@/lib/utils";
import type { StorefrontListParams } from "@/types/product";

const SORT_OPTIONS = [
  { label: "Сначала новинки", value: "newest" },
  { label: "Цена: по возрастанию", value: "price_asc" },
  { label: "Цена: по убыванию", value: "price_desc" },
];

interface ProductGridProps {
  gender?: string;
}

const ProductGrid = ({ gender }: ProductGridProps = {}) => {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [activeSort, setActiveSort] = useState<StorefrontListParams['sort']>('newest');

  // Fetch up to 1000 products once; filtering is client-side (catalog still small)
  const { data, isLoading, isError } = useProducts({
    limit: 1000,
    sort: activeSort,
    ...(gender ? { gender } : {}),
  });

  const filterConfigs: FilterConfig[] = useMemo(() => {
    if (!data?.filters) return [];
    const configs: FilterConfig[] = [];

    if (data.filters.categories.length) {
      configs.push({
        name: "Категория",
        key: "category",
        options: data.filters.categories.map((c) => ({ label: c, value: c })),
      });
    }
    if (data.filters.brands.length) {
      configs.push({
        name: "Бренд",
        key: "brand",
        options: data.filters.brands.map((b) => ({ label: b, value: b })),
      });
    }
    if (data.filters.colors.length) {
      configs.push({
        name: "Цвет",
        key: "color",
        options: data.filters.colors.map((c) => ({ label: c, value: c })),
      });
    }
    return configs;
  }, [data?.filters]);

  // Client-side filtering against API filters (multi-select)
  const filtered = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((p) => {
      for (const [key, values] of Object.entries(activeFilters)) {
        if (!values.length) continue;
        const field = (p as Record<string, unknown>)[key];
        if (typeof field === "string" && !values.includes(field)) return false;
        if (field == null) return false;
      }
      return true;
    });
  }, [data?.items, activeFilters]);

  const handleSortChange = (sort: string) => {
    setActiveSort((sort as StorefrontListParams['sort']) || 'newest');
  };

  if (isLoading) {
    return (
      <section className="w-full mb-16 px-6">
        <div className="h-10 mb-8 bg-secondary/50 animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="w-full mb-16 px-6">
        <p className="text-sm text-muted-foreground text-center py-16">
          Не удалось загрузить товары. Попробуйте позже.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full mb-16 px-6">
      <CatalogFilters
        filters={filterConfigs}
        sort={{ options: SORT_OPTIONS }}
        activeFilters={activeFilters}
        activeSort={activeSort ?? ''}
        onFilterChange={setActiveFilters}
        onSortChange={handleSortChange}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">Товары не найдены. Попробуйте изменить фильтры.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              brand={product.brand ?? ''}
              name={product.name}
              price={formatPrice(product.price, product.currency)}
              image={product.photos[0]?.url ?? ''}
              hoverImage={product.photos[1]?.url}
              isNew={product.is_new}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductGrid;
