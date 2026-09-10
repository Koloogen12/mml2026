import { FileText, Mail } from 'lucide-react';
import Link from 'next/link';

import AdminShell from '@/components/admin/AdminShell';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// Dashboard — quick counts + links. More detail once we wire up JSON-form
// imports + draft posts in the next milestones.

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await auth();

  const [postCount, leadCount, draftCount] = await Promise.all([
    prisma.blogPost.count(),
    prisma.leadRequest.count(),
    prisma.blogPost.count({ where: { status: 'draft' } })
  ]);

  return (
    <AdminShell>
      <h1 className="text-[28px] font-semibold tracking-tight">
        Привет, {session?.user?.name || session?.user?.email?.split('@')[0]}
      </h1>
      <p className="mt-1 text-[14px] text-[var(--admin-muted)]">
        Короткая сводка по заявкам и блогу.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          href="/admin/leads"
          icon={<Mail className="h-4 w-4" />}
          label="Заявки"
          value={leadCount}
          sub="всего в БД"
        />
        <StatCard
          href="/admin/blog"
          icon={<FileText className="h-4 w-4" />}
          label="Посты"
          value={postCount}
          sub={`${draftCount} в черновиках`}
        />
      </div>
    </AdminShell>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
  sub
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-center gap-2 text-[13px] text-[var(--admin-muted)]">
        {icon}
        {label}
      </div>
      <div className="text-[32px] font-semibold tabular-nums leading-none tracking-tight">
        {value}
      </div>
      <div className="text-[12px] text-[var(--admin-muted)]">{sub}</div>
    </Link>
  );
}
