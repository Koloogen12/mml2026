import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const COLOR_LABELS: Record<string, string> = {
  Black: "Чёрный",
  White: "Белый",
  Blue: "Синий",
  Neutrals: "Нейтральный",
  Yellow: "Жёлтый",
  Brown: "Коричневый",
  Grey: "Серый",
  Pink: "Розовый",
  Green: "Зелёный",
  Red: "Красный",
};

const CATEGORY_LABELS: Record<string, string> = {
  tops: "Верх",
  bottoms: "Низ",
  dresses: "Платья",
  outerwear: "Верхняя одежда",
  wedding: "Свадебная коллекция",
};

interface ActiveFilters {
  brands: string[];
  colors: string[];
  priceMin?: number;
  priceMax?: number;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    brands: string[];
    colors: string[];
    price_min: number;
    price_max: number;
  };
  active: ActiveFilters;
  onChange: (next: ActiveFilters) => void;
}

const FilterPanel = ({ isOpen, onClose, filters, active, onChange }: FilterPanelProps) => {
  if (!isOpen) return null;

  const toggleBrand = (brand: string) => {
    const next = active.brands.includes(brand)
      ? active.brands.filter((b) => b !== brand)
      : [...active.brands, brand];
    onChange({ ...active, brands: next });
  };

  const toggleColor = (color: string) => {
    const next = active.colors.includes(color)
      ? active.colors.filter((c) => c !== color)
      : [...active.colors, color];
    onChange({ ...active, colors: next });
  };

  const clearAll = () => onChange({ brands: [], colors: [] });

  const hasActive = active.brands.length > 0 || active.colors.length > 0;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-80 bg-background border-l border-border flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-light tracking-wider uppercase">Фильтры</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Бренды */}
          {filters.brands.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Бренд</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filters.brands.map((brand) => (
                  <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
                    <span className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center transition-colors ${
                      active.brands.includes(brand) ? 'bg-foreground border-foreground' : 'border-border group-hover:border-foreground'
                    }`}>
                      {active.brands.includes(brand) && (
                        <svg className="w-2 h-2 text-background" fill="currentColor" viewBox="0 0 8 8">
                          <path d="M1.5 4L3 5.5L6.5 2"/>
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-light text-foreground">{brand}</span>
                    <input type="checkbox" className="sr-only" checked={active.brands.includes(brand)} onChange={() => toggleBrand(brand)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Цвета */}
          {filters.colors.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Цвет</h3>
              <div className="flex flex-wrap gap-2">
                {filters.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => toggleColor(color)}
                    className={`px-3 py-1.5 text-xs font-light border transition-colors ${
                      active.colors.includes(color)
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-foreground hover:border-foreground'
                    }`}
                  >
                    {COLOR_LABELS[color] || color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Цена */}
          {filters.price_max > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Цена</h3>
                <p className="text-sm font-light text-muted-foreground">
                  {filters.price_min.toLocaleString('ru-RU')} ₽ — {filters.price_max.toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {hasActive && (
          <div className="px-6 py-4 border-t border-border">
            <button
              onClick={clearAll}
              className="text-xs font-light text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Сбросить все фильтры
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface FilterSortBarProps {
  total: number;
  sort: string;
  onSortChange: (v: string) => void;
  filters: {
    brands: string[];
    colors: string[];
    price_min: number;
    price_max: number;
  };
  active: ActiveFilters;
  onFilterChange: (next: ActiveFilters) => void;
}

const FilterSortBar = ({ total, sort, onSortChange, filters, active, onFilterChange }: FilterSortBarProps) => {
  const activeCount = active.brands.length + active.colors.length;
  const [panelOpen, setPanelOpen] = React.useState(false);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <p className="text-sm font-light text-muted-foreground">{total} товаров</p>
          {activeCount > 0 && (
            <span className="text-xs font-light bg-foreground text-background px-2 py-0.5">
              {activeCount} фильтра
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            className="text-sm font-light text-foreground hover:text-muted-foreground transition-colors"
            onClick={() => setPanelOpen(true)}
          >
            Фильтры{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>

          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-xs font-light border-none bg-transparent focus:outline-none cursor-pointer text-foreground"
          >
            <option value="newest">Сначала новинки</option>
            <option value="price_asc">Цена: по возрастанию</option>
            <option value="price_desc">Цена: по убыванию</option>
          </select>
        </div>
      </div>

      <FilterPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        filters={filters}
        active={active}
        onChange={onFilterChange}
      />
    </>
  );
};

import React from "react";
export default FilterSortBar;
export type { ActiveFilters };
