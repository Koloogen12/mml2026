'use client';

import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ArticleCard } from '@/components/blog/ArticleCard';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { FeaturedCard } from '@/components/blog/FeaturedCard';
import { LeadMagnet } from '@/components/blog/LeadMagnet';
import { SectionTitle } from '@/components/blog/SectionTitle';
import { TagChip } from '@/components/blog/TagChip';
import type { Article } from '@/data/blog';

// Interactive list UI for /blog. Articles (DB + static merged) are
// passed down from the server component so the whole page still SSRs.

export function BlogIndexClient({
  articles,
  categories
}: {
  articles: Article[];
  categories: readonly string[];
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string>('Все');
  const [sort, setSort] = useState<'new' | 'popular'>('new');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const featured = useMemo(
    () => articles.find((a) => a.featured) ?? articles[0],
    [articles]
  );

  const filtered = useMemo(() => {
    const list = articles.filter((a) => {
      // Hide the featured card from the default unfiltered view to avoid
      // rendering the same article twice (big featured + grid card).
      if (featured && a.slug === featured.slug && category === 'Все' && !debounced) return false;
      const okCat = category === 'Все' || a.category === category;
      if (!debounced) return okCat;
      const hay = `${a.title} ${a.excerpt} ${a.tags.join(' ')} ${a.category}`.toLowerCase();
      return okCat && hay.includes(debounced);
    });
    return [...list].sort((a, b) =>
      sort === 'new' ? b.date.localeCompare(a.date) : b.readingTime - a.readingTime
    );
  }, [articles, debounced, category, sort, featured]);

  const totalCount = articles.filter((a) => {
    const okCat = category === 'Все' || a.category === category;
    if (!debounced) return okCat;
    const hay = `${a.title} ${a.excerpt} ${a.tags.join(' ')} ${a.category}`.toLowerCase();
    return okCat && hay.includes(debounced);
  }).length;

  const isFiltering = !!debounced || category !== 'Все';

  return (
    <div className="min-h-screen bg-brand-bg font-inter text-brand-ink">
      <BlogHeader />

      <main>
        {/* Hero */}
        <section className="pt-[60px] md:pt-[100px]">
          <div className="mx-auto max-w-container-brand px-4 md:px-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]"
            >
              <div className="flex flex-col items-start gap-6 text-left">
                <SectionTitle>Статьи и обзоры</SectionTitle>
                <h1
                  className="font-bold text-brand-ink"
                  style={{
                    fontSize: 'clamp(40px, 6.4vw, 64px)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05
                  }}
                >
                  Блог<span className="text-brand-accent">.</span>
                </h1>
                <p className="max-w-[520px] text-[18px] leading-[1.5] text-brand-muted">
                  Кейсы, гайды и инсайты о виртуальной примерочной, AI в
                  fashion-ритейле и метриках, которые двигают бизнес.
                </p>
                <div className="flex items-center gap-2 text-[13px] text-brand-muted">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {articles.length} материалов · обновляется еженедельно
                </div>
              </div>
              <LeadMagnet variant="hero" />
            </motion.div>
          </div>
        </section>

        {/* Featured */}
        {!isFiltering && featured && (
          <section className="mt-14 md:mt-20">
            <div className="mx-auto max-w-container-brand px-4 md:px-2">
              <FeaturedCard article={featured} />
            </div>
          </section>
        )}

        {/* Controls */}
        <section className="mt-14">
          <div className="mx-auto max-w-container-brand px-4 md:px-2">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full max-w-[480px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по статьям…"
                    className="h-[44px] w-full rounded-[100px] border border-brand-border bg-white pl-11 pr-10 text-[14px] text-brand-ink placeholder:text-brand-muted focus:border-brand-accent focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Очистить"
                      className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-brand-muted hover:bg-brand-bg hover:text-brand-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-[100px] bg-white p-1 text-[13px]">
                  <button
                    type="button"
                    onClick={() => setSort('new')}
                    className={`rounded-[100px] px-4 py-1.5 transition-colors duration-200 ${
                      sort === 'new'
                        ? 'bg-brand-cta text-white'
                        : 'text-brand-muted hover:text-brand-ink'
                    }`}
                  >
                    Новое
                  </button>
                  <button
                    type="button"
                    onClick={() => setSort('popular')}
                    className={`rounded-[100px] px-4 py-1.5 transition-colors duration-200 ${
                      sort === 'popular'
                        ? 'bg-brand-cta text-white'
                        : 'text-brand-muted hover:text-brand-ink'
                    }`}
                  >
                    Длинные
                  </button>
                </div>
              </div>

              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                {categories.map((c) => (
                  <TagChip
                    key={c}
                    active={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </TagChip>
                ))}
              </div>

              {isFiltering && (
                <div className="text-[13px] text-brand-muted">
                  Найдено:{' '}
                  <span className="font-medium text-brand-ink">{totalCount}</span>
                  {debounced && (
                    <>
                      {' '}
                      по запросу «<span className="text-brand-ink">{debounced}</span>»
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="mt-8 pb-16">
          <div className="mx-auto max-w-container-brand px-4 md:px-2">
            {filtered.length === 0 ? (
              <div className="rounded-[24px] bg-white p-12 text-center">
                <p className="text-[18px] font-medium text-brand-ink">
                  Ничего не нашли
                </p>
                <p className="mt-2 text-[14px] text-brand-muted">
                  Попробуйте изменить запрос или выбрать другую категорию.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCategory('Все');
                  }}
                  className="mt-5 inline-flex h-10 items-center rounded-[100px] bg-brand-cta px-5 text-[13px] font-medium text-white hover:bg-brand-cta-hover"
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((a, i) => (
                  <ArticleCard
                    key={a.slug}
                    article={a}
                    index={i}
                    query={debounced}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
