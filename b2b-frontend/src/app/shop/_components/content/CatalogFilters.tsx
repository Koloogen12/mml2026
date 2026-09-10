'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  name: string;
  key: string;
  options: FilterOption[];
  type?: 'single' | 'multi';
}

export type ActiveFilters = Record<string, string[]>;

interface SortConfig {
  options: FilterOption[];
}

interface CatalogFiltersProps {
  filters: FilterConfig[];
  sort?: SortConfig;
  activeFilters: ActiveFilters;
  activeSort: string;
  onFilterChange: (filters: ActiveFilters) => void;
  onSortChange: (sort: string) => void;
}

const CatalogFilters = ({ filters, sort, activeFilters, activeSort, onFilterChange, onSortChange }: CatalogFiltersProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCount = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleFilter = (key: string, value: string) => {
    const current = activeFilters[key] || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFilterChange({ ...activeFilters, [key]: next });
  };

  const clearAll = () => { onFilterChange({}); onSortChange(''); };

  return (
    <div ref={containerRef} className="relative z-20 flex items-center gap-3 mb-8 pb-2 flex-wrap">
      {filters.map((filter) => {
        const isOpen = openDropdown === filter.key;
        const selected = activeFilters[filter.key] || [];
        return (
          <div key={filter.key} className="relative">
            <button
              onClick={() => setOpenDropdown(isOpen ? null : filter.key)}
              className={`text-xs font-light border px-4 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${selected.length > 0 ? 'border-foreground text-foreground bg-foreground/5' : 'border-border text-foreground hover:border-foreground'}`}
            >
              {filter.name}
              {selected.length > 0 && (
                <span className="bg-foreground text-background text-[0.55rem] w-4 h-4 rounded-full flex items-center justify-center font-medium">{selected.length}</span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
            </button>
            {isOpen && (
              <div className="absolute top-full left-0 mt-1 bg-background border border-border z-50 min-w-[180px] max-h-[260px] overflow-y-auto shadow-lg">
                {filter.options.map((opt) => {
                  const isChecked = selected.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleFilter(filter.key, opt.value)}
                      className={`w-full text-left px-4 py-2.5 text-xs font-light flex items-center gap-2 transition-colors ${isChecked ? 'bg-foreground/5 text-foreground' : 'text-foreground/70 hover:bg-muted'}`}
                    >
                      <span className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-foreground bg-foreground' : 'border-border'}`}>
                        {isChecked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.2" /></svg>}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {sort && (
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === '_sort' ? null : '_sort')}
            className={`text-xs font-light border px-4 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeSort ? 'border-foreground text-foreground bg-foreground/5' : 'border-border text-foreground hover:border-foreground'}`}
          >
            Сортировка
            <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === '_sort' ? 'rotate-180' : ''}`} strokeWidth={1.5} />
          </button>
          {openDropdown === '_sort' && (
            <div className="absolute top-full right-0 mt-1 bg-background border border-border z-50 min-w-[200px] shadow-lg">
              {sort.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onSortChange(opt.value === activeSort ? '' : opt.value); setOpenDropdown(null); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-light transition-colors ${activeSort === opt.value ? 'bg-foreground/5 text-foreground font-normal' : 'text-foreground/70 hover:bg-muted'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {activeCount > 0 && (
        <button onClick={clearAll} className="text-xs font-light text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ml-1">
          <X className="w-3 h-3" />
          Сбросить
        </button>
      )}
    </div>
  );
};

export default CatalogFilters;

