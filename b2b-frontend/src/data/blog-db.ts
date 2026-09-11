// Adapter layer that exposes DB-backed blog posts in the same `Article`
// shape that the Lovable static data (`@/data/blog`) uses. Lets the
// public /blog pages mix published-from-admin posts with the seed
// static posts without branching the UI.

import type { Article } from '@/data/blog';
import { articles as staticArticles, authors } from '@/data/blog';
import { prisma } from '@/lib/db';

function minutesFromHtml(html: string): number {
  // Strip tags, count words, assume 200 wpm. Floor at 1 minute.
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.round(words / 200));
}

// Default author shown for DB-authored posts. Team-author bio is defined
// in @/data/blog so the Avatar + AuthorBio components render normally.
function pickDefaultAuthorId(): string {
  // Prefer an author with id "team" if it exists in the static dataset;
  // otherwise use the first author as a stable fallback.
  if (authors.team) return 'team';
  const first = Object.keys(authors)[0];
  return first ?? 'team';
}

// DB post → Lovable Article. The `content` array is always a single
// "html" block (a Block variant that ArticleRenderer renders via
// dangerouslySetInnerHTML). Front-end checks the block's `type` first,
// so we don't need to touch existing rich Block handling.
function toArticle(p: {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  contentHtml: string;
  publishedAt: Date | null;
  updatedAt: Date;
}): Article {
  const publishedAt = p.publishedAt ?? p.updatedAt;

  return {
    slug: p.slug,
    title: p.title,
    // `lead` is required by the Article type — fall back to excerpt, then
    // an empty string so the UI doesn't crash.
    lead: p.excerpt ?? '',
    excerpt: p.excerpt ?? '',
    category: 'Статьи',
    tags: [],
    authorId: pickDefaultAuthorId(),
    date: publishedAt.toISOString().slice(0, 10), // YYYY-MM-DD
    updated: undefined,
    readingTime: minutesFromHtml(p.contentHtml),
    cover: p.coverUrl || '/assets/images/og-ru.jpeg',
    featured: false,
    // A single "html" block that ArticleRenderer now understands.
    content: [{ type: 'html', html: p.contentHtml } as unknown as Article['content'][number]],
    tldr: undefined,
    clients: undefined
  };
}

export async function getPublishedArticles(): Promise<Article[]> {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' }
  });
  return posts.map(toArticle);
}

export async function getDbArticleBySlug(slug: string): Promise<Article | null> {
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: 'published' }
  });
  if (!post) return null;
  return toArticle(post);
}

// Merged list: published DB posts first, then static seed posts that are
// not already "replaced" by a DB post with the same slug. This lets the
// admin publish new posts without hiding the Lovable demo content until
// the editor has produced enough material to stand on its own.
export async function getMergedArticles(): Promise<Article[]> {
  const db = await getPublishedArticles();
  const dbSlugs = new Set(db.map((a) => a.slug));
  const merged = [
    ...db,
    ...staticArticles.filter((a) => !dbSlugs.has(a.slug))
  ];
  // Sort by date desc so latest shows first regardless of origin.
  return merged.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getMergedArticleBySlug(
  slug: string
): Promise<Article | null> {
  const fromDb = await getDbArticleBySlug(slug);
  if (fromDb) return fromDb;
  return staticArticles.find((a) => a.slug === slug) ?? null;
}
