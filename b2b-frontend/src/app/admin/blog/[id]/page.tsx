import { notFound } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import BlogEditor from '@/components/admin/BlogEditor';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({
  params
}: {
  params: { id: string };
}) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  // Serialize dates for the client component.
  const serialized = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverUrl: post.coverUrl,
    contentHtml: post.contentHtml,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString()
  };

  return (
    <AdminShell>
      <BlogEditor post={serialized} />
    </AdminShell>
  );
}
