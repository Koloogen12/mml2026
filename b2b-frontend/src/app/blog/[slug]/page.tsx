import type { Metadata } from 'next';
import Link from 'next/link';

import { BlogArticleClient } from '@/components/blog/BlogArticleClient';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { SectionTitle } from '@/components/blog/SectionTitle';
import { auth } from '@/auth';
import { authors } from '@/data/blog';
import {
  getDraftArticleBySlug,
  getMergedArticleBySlug,
  getMergedArticles
} from '@/data/blog-db';

// Server component: fetches the article (DB first, static fallback) and
// hands it to a client child for the rich interactive layout.

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
  searchParams: { draft?: string };
}

/**
 * Статья по slug. Обычно — только опубликованная.
 *
 * С ?draft=1 отдаётся и черновик, но лишь тому, кто вошёл в админку: иначе
 * единственным способом посмотреть свой текст глазами читателя было бы
 * опубликовать его. Проверка идёт по сессии, не по параметру, поэтому ссылку
 * на предпросмотр можно спокойно переслать — чужому она покажет 404.
 */
async function resolveArticle(slug: string, wantsDraft: boolean) {
  const published = await getMergedArticleBySlug(slug);
  if (published) return { article: published, isDraft: false };
  if (!wantsDraft) return { article: null, isDraft: false };

  const session = await auth();
  if (!session?.user) return { article: null, isDraft: false };

  return { article: await getDraftArticleBySlug(slug), isDraft: true };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { article, isDraft } = await resolveArticle(params.slug, searchParams.draft === '1');
  if (!article) {
    return { title: 'Статья не найдена — MakeMeLook' };
  }
  return {
    title: `${article.title} — Блог MakeMeLook`,
    // Черновик не должен попасть в индекс, даже если ссылку куда-то вставят.
    robots: isDraft ? { index: false, follow: false } : undefined,
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

export default async function BlogArticlePage({ params, searchParams }: Props) {
  const { article, isDraft } = await resolveArticle(params.slug, searchParams.draft === '1');

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
            href="/blog"
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

  return (
    <>
      {isDraft && (
        <div className="sticky top-0 z-50 bg-brand-accent px-4 py-2 text-center text-[13px] font-medium text-white">
          Черновик — виден только вам. На сайте статьи пока нет.
        </div>
      )}
      <BlogArticleClient article={article} author={author} related={related} />
    </>
  );
}
