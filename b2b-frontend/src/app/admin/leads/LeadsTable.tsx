'use client';

import { Check, Circle, Copy, Mail, Phone, Send, ShoppingBag, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import {
  deleteLeadAction,
  markAllReadAction,
  toggleLeadReadAction
} from './actions';

type LeadRow = {
  id: number;
  name: string;
  contactType: string;
  contactValue: string;
  ip: string | null;
  referer: string | null;
  read: boolean;
  createdAt: string; // ISO string
};

type Filter = 'all' | 'unread' | 'email' | 'tg' | 'wb' | 'tel';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'unread', label: 'Непрочитанные' },
  { id: 'tg', label: 'Telegram' },
  { id: 'email', label: 'Email' },
  { id: 'tel', label: 'Телефон' },
  { id: 'wb', label: 'WhatsApp' }
];

const CONTACT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  tel: Phone,
  tg: Send,
  wb: ShoppingBag
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = leads.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !l.read;
    return l.contactType === filter;
  });

  const unreadCount = leads.filter((l) => !l.read).length;

  const onToggleRead = (id: number) => {
    startTransition(() => {
      toggleLeadReadAction(id);
    });
  };

  const onMarkAll = () => {
    if (!confirm('Отметить все как прочитанные?')) return;
    startTransition(() => {
      markAllReadAction();
    });
  };

  const onDelete = (id: number) => {
    if (!confirm('Удалить заявку? Это необратимо.')) return;
    startTransition(() => {
      deleteLeadAction(id);
    });
  };

  const copy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count =
            f.id === 'all'
              ? leads.length
              : f.id === 'unread'
                ? unreadCount
                : leads.filter((l) => l.contactType === f.id).length;
          if (count === 0 && f.id !== 'all' && f.id !== 'unread') return null;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-[var(--admin-ink)] text-white'
                  : 'bg-[var(--admin-surface)] text-[var(--admin-muted)] hover:text-[var(--admin-ink)]'
              }`}
            >
              {f.label}
              <span
                className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--admin-bg)] text-[var(--admin-muted)]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            disabled={isPending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--admin-ink)] transition-colors hover:bg-[var(--admin-bg)] disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Отметить все как прочитанные
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[14px] text-[var(--admin-muted)]">
            Нет заявок в этой категории.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg)] text-left text-[12px] uppercase tracking-wide text-[var(--admin-muted)]">
                <th className="w-8 px-3 py-3" />
                <th className="px-3 py-3 font-medium">Имя</th>
                <th className="px-3 py-3 font-medium">Контакт</th>
                <th className="px-3 py-3 font-medium">Дата</th>
                <th className="px-3 py-3 font-medium">IP</th>
                <th className="w-20 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const Icon = CONTACT_ICON[lead.contactType] ?? Circle;
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-[var(--admin-border)] last:border-0 transition-colors hover:bg-[var(--admin-bg)] ${
                      !lead.read ? 'bg-[var(--admin-accent-soft)]/30' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onToggleRead(lead.id)}
                        title={lead.read ? 'Отметить непрочитанной' : 'Отметить прочитанной'}
                        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                          lead.read
                            ? 'text-[var(--admin-muted)] hover:text-[var(--admin-ink)]'
                            : 'text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)]'
                        }`}
                      >
                        {lead.read ? (
                          <Circle className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 fill-current" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-[14px] font-medium text-[var(--admin-ink)]">
                      {lead.name}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => copy(lead.contactValue, lead.id)}
                        className="group inline-flex items-center gap-2 text-[14px] text-[var(--admin-ink)]"
                        title="Скопировать"
                      >
                        <Icon className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                        <span className="font-mono text-[13px]">{lead.contactValue}</span>
                        {copiedId === lead.id ? (
                          <Check className="h-3 w-3 text-[var(--admin-success)]" />
                        ) : (
                          <Copy className="h-3 w-3 text-[var(--admin-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[13px] text-[var(--admin-muted)] tabular-nums">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-[12px] text-[var(--admin-muted)]">
                      {lead.ip ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onDelete(lead.id)}
                        disabled={isPending}
                        title="Удалить"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--admin-muted)] transition-colors hover:bg-red-50 hover:text-[var(--admin-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
