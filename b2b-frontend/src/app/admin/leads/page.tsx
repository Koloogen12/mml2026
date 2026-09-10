import AdminShell from '@/components/admin/AdminShell';
import { prisma } from '@/lib/db';

import LeadsTable from './LeadsTable';

// Always re-fetch on request — leads flow in via the public form endpoint.
export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const leads = await prisma.leadRequest.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // Serialize dates for the client component.
  const rows = leads.map((l) => ({
    id: l.id,
    name: l.name,
    contactType: l.contactType,
    contactValue: l.contactValue,
    ip: l.ip,
    referer: l.referer,
    read: l.read,
    createdAt: l.createdAt.toISOString()
  }));

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Заявки</h1>
          <p className="mt-1 text-[13px] text-[var(--admin-muted)]">
            Все демо-запросы с формы на <code>b2b.makemelook.ai</code>, плюс исторические данные из data/forms.
          </p>
        </div>
        <div className="text-[13px] text-[var(--admin-muted)]">
          Всего: <span className="font-medium text-[var(--admin-ink)]">{rows.length}</span>
        </div>
      </div>

      <div className="mt-6">
        <LeadsTable leads={rows} />
      </div>
    </AdminShell>
  );
}
