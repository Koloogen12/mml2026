'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import ProductCard from '../content/ProductCard';
import FilterSortBar, { type ActiveFilters } from './FilterSortBar';
import { useProducts } from '../../_hooks/useProducts';
import { formatPrice } from '../../_lib/utils';
import type { StorefrontListParams } from '../../_types/product';

const PAGE_SIZE = 24;

interface CategoryProductGridProps {
  category?: string;
  genderOverride?: string;
}

const emptyFilters = { brands: [], colors: [] };

const CategoryProductGrid = ({ category, genderOverride }: CategoryProductGridProps) => {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<string>('newest');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(emptyFilters);

  const isNewCategory = category === 'new';

  const params: StorefrontListParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    sort: sort as StorefrontListParams['sort'],
    ...(isNewCategory ? {} : category ? { category } : {}),
    ...(genderOverride ? { gender: genderOverride } : {}),
    ...(activeFilters.brands.length === 1 ? { brand: activeFilters.brands[0] } : {}),
    ...(activeFilters.colors.length === 1 ? { color: activeFilters.colors[0] } : {}),
  };

  const { data, isLoading, isError } = useProducts(params);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const apiFilters = data?.filters ?? { categories: [], brands: [], colors: [], price_min: 0, price_max: 0 };

  const handleSortChange = (v: string) => { setSort(v); setPage(0); };
  const handleFilterChange = (next: ActiveFilters) => { setActiveFilters(next); setPage(0); };

  return (
    <section className="w-full px-6 mb-16">
      <FilterSortBar
        total={data?.total ?? 0}
        sort={sort}
        onSortChange={handleSortChange}
        filters={apiFilters}
        active={activeFilters}
        onFilterChange={handleFilterChange}
      />
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
          ))}
        </div>
      )}
      {isError && <p className="text-sm text-muted-foreground text-center py-16">Не удалось загрузить товары. Попробуйте позже.</p>}
      {!isLoading && !isError && data && (
        <>
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">В этой категории пока нет товаров.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {data.items.map((product) => (
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
          {totalPages > 1 && (
            <div className="flex items-center gap-2 mt-10">
              <Button variant="ghost" size="sm" className="p-2 hover:bg-transparent hover:opacity-50 disabled:opacity-30 -ml-2" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button key={i} variant="ghost" size="sm" className={`min-w-8 h-8 hover:bg-transparent text-sm ${i === page ? 'underline font-normal' : 'hover:underline font-light'}`} onClick={() => setPage(i)}>
                  {i + 1}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="p-2 hover:bg-transparent hover:opacity-50 disabled:opacity-30" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default CategoryProductGrid;

