import type { Metadata } from 'next';
import Link from 'next/link';

import { BlogArticleClient } from '@/components/blog/BlogArticleClient';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { SectionTitle } from '@/components/blog/SectionTitle';
import { authors } from '@/data/blog';
import { getMergedArticleBySlug, getMergedArticles } from '@/data/blog-db';

// Server component: fetches the article (DB first, static fallback) and
// hands it to a client child for the rich interactive layout.

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getMergedArticleBySlug(params.slug);
  if (!article) {
    return { title: 'Статья не найдена — MakeMeLook' };
  }
  return {
    title: `${article.title} — Блог MakeMeLook`,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      images: article.cover ? [{ url: article.cover }] : undefined,
      type: 'article'
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt || undefined,
      images: article.cover ? [article.cover] : undefined
    }
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const article = await getMergedArticleBySlug(params.slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-brand-bg font-inter text-brand-ink">
        <BlogHeader />
        <main className="mx-auto flex max-w-container-brand flex-col items-center gap-6 px-4 py-32 text-center md:px-2">
          <SectionTitle>404</SectionTitle>
          <h1 className="text-[36px] font-bold tracking-[-0.02em]">
            Статья не найдена
          </h1>
          <p className="text-brand-muted">
            Возможно, материал был перемещён или удалён.
          </p>
          <Link
            href="/ru/blog"
            className="inline-flex h-[42px] items-center rounded-[100px] bg-brand-cta px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-brand-cta-hover"
          >
            Вернуться в блог
          </Link>
        </main>
        <BlogFooter />
      </div>
    );
  }

  const author =
    authors[article.authorId] ?? authors.team ?? Object.values(authors)[0];

  // Related: 3 most recent from merged pool, excluding self.
  const all = await getMergedArticles();
  const related = all.filter((a) => a.slug !== article.slug).slice(0, 3);

  return <BlogArticleClient article={article} author={author} related={related} />;
}
