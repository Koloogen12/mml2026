'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { ArticleRenderer } from '@/components/blog/ArticleRenderer';
import { AuthorBio } from '@/components/blog/AuthorBio';
import { Avatar } from '@/components/blog/Avatar';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { ClientsStrip } from '@/components/blog/ClientsStrip';
import { HelpfulFeedback } from '@/components/blog/HelpfulFeedback';
import { InlineCTA } from '@/components/blog/InlineCTA';
import { ReadingProgress } from '@/components/blog/ReadingProgress';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { ShareButtons } from '@/components/blog/ShareButtons';
import { StickyDemoCTA } from '@/components/blog/StickyDemoCTA';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { TagChip } from '@/components/blog/TagChip';
import { TLDR } from '@/components/blog/TLDR';
import type { Article, Author } from '@/data/blog';
import { formatDate } from '@/data/blog';

export function BlogArticleClient({
  article,
  author,
  related
}: {
  article: Article;
  author: Author;
  related: Article[];
}) {
  return (
    <div className="min-h-screen bg-brand-bg font-inter text-brand-ink">
      <ReadingProgress />
      <BlogHeader />
      <StickyDemoCTA />

      <main>
        {/* Header */}
        <section className="pt-10 md:pt-14">
          <div className="mx-auto max-w-prose-brand px-4 md:px-2">
            <nav className="mb-6 flex items-center gap-1 text-[13px] text-brand-muted">
              <Link href="/" className="hover:text-brand-ink">
                Главная
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/blog" className="hover:text-brand-ink">
                Блог
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="truncate text-brand-ink">{article.title}</span>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-wrap gap-2">
                <TagChip as="span">{article.category}</TagChip>
              </div>
              <h1
                className="font-bold text-brand-ink"
                style={{
                  fontSize: 'clamp(32px, 4.6vw, 48px)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1
                }}
              >
                {article.title}
              </h1>
              {article.lead && (
                <p className="text-[20px] leading-[1.5] text-brand-ink/75">
                  {article.lead}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-brand-muted">
                <div className="flex items-center gap-2">
                  <Avatar author={author} size={32} />
                  <span className="font-medium text-brand-ink">
                    {author.name}
                  </span>
                </div>
                <span>·</span>
                <span>{formatDate(article.date)}</span>
                {article.updated && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> обновлено{' '}
                      {formatDate(article.updated)}
                    </span>
                  </>
                )}
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {article.readingTime} мин
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Cover */}
        <section className="mt-8">
          <div className="mx-auto max-w-container-brand px-4 md:px-2">
            <div className="aspect-[16/9] overflow-hidden rounded-[24px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.cover}
                alt={article.title}
                width={1280}
                height={736}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="mt-12 md:mt-16">
          <div className="mx-auto max-w-container-brand px-4 md:px-2">
            <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="lg:order-1">
                <TableOfContents blocks={article.content} />
                <div className="mt-8 hidden lg:block">
                  <ShareButtons title={article.title} />
                </div>
              </aside>

              <div className="lg:order-2">
                <article className="mx-auto max-w-prose-brand">
                  {article.tldr && <TLDR items={article.tldr} />}
                  {article.clients && <ClientsStrip items={article.clients} />}

                  <ArticleRenderer blocks={article.content} />

                  {article.tags.length > 0 && (
                    <div className="mt-10 flex flex-wrap gap-2">
                      {article.tags.map((t) => (
                        <TagChip key={t} as="span">
                          #{t}
                        </TagChip>
                      ))}
                    </div>
                  )}

                  <InlineCTA
                    title="Получите такие же результаты"
                    text="За 15 минут покажем демо примерочной на ваших товарах и оценим эффект."
                    button="Запросить демо"
                  />

                  <AuthorBio author={author} />
                  <HelpfulFeedback />

                  <div className="mt-10 lg:hidden">
                    <ShareButtons title={article.title} />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <RelatedArticles items={related} />
      </main>

      <BlogFooter />
    </div>
  );
}
