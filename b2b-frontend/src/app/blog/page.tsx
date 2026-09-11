import type { Metadata } from 'next';

import { BlogIndexClient } from '@/components/blog/BlogIndexClient';
import { categories } from '@/data/blog';
import { getMergedArticles } from '@/data/blog-db';

// Server component: fetches the merged article list (DB published +
// static seed, DB-first) and hands it to a client child for search +
// filter + sort interactions.

export const metadata: Metadata = {
  title: 'Блог — MakeMeLook',
  description:
    'Статьи, кейсы и гайды о виртуальной примерочной MakeMeLook для fashion-ритейла.'
};

export const dynamic = 'force-dynamic';

export default async function BlogIndexPage() {
  const articles = await getMergedArticles();
  return <BlogIndexClient articles={articles} categories={categories} />;
}
