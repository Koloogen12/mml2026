import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';

import AdminShell from '@/components/admin/AdminShell';
import { prisma } from '@/lib/db';

import { createPostAction } from './actions';

export const dynamic = 'force-dynamic';

function formatDate(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default async function AdminBlogListPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }]
  });

  const drafts = posts.filter((p) => p.status !== 'published');
  const published = posts.filter((p) => p.status === 'published');

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Блог</h1>
          <p className="mt-1 text-[13px] text-[var(--admin-muted)]">
            Управление статьями: черновики, публикация, редактирование.
          </p>
        </div>

        <form action={createPostAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--admin-accent)] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Новый пост
          </button>
        </form>
      </div>

      <Section title="Черновики" emptyLabel="Нет черновиков" posts={drafts} />
      <Section title="Опубликованные" emptyLabel="Пока ничего не опубликовано" posts={published} />
    </AdminShell>
  );
}

function Section({
  title,
  emptyLabel,
  posts
}: {
  title: string;
  emptyLabel: string;
  posts: Array<{
    id: number;
    slug: string;
    title: string;
    status: string;
    publishedAt: Date | null;
    updatedAt: Date;
  }>;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
        {title} · {posts.length}
      </h2>

      <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        {posts.length === 0 ? (
          <div className="px-6 py-10 text-center text-[14px] text-[var(--admin-muted)]">
            {emptyLabel}
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--admin-border)] last:border-0 transition-colors hover:bg-[var(--admin-bg)]"
                >
                  <td className="w-10 px-3 py-3 text-[var(--admin-muted)]">
                    <FileText className="h-4 w-4" />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/blog/${p.id}`}
                      className="text-[14px] font-medium text-[var(--admin-ink)] hover:text-[var(--admin-accent)]"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-0.5 font-mono text-[12px] text-[var(--admin-muted)]">
                      /ru/blog/{p.slug}
                    </div>
                  </td>
                  <td className="w-40 px-3 py-3 text-[13px] text-[var(--admin-muted)]">
                    {p.status === 'published' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[12px] font-medium text-green-700">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        опубликовано
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--admin-muted)]">
                        черновик
                      </span>
                    )}
                  </td>
                  <td className="w-36 whitespace-nowrap px-3 py-3 text-right text-[12px] tabular-nums text-[var(--admin-muted)]">
                    {p.status === 'published'
                      ? `опубл. ${formatDate(p.publishedAt)}`
                      : `обновл. ${formatDate(p.updatedAt)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
