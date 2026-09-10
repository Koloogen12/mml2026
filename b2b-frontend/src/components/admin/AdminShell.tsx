'use client';

import { FileText, Home, LogOut, Mail, Settings } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Sidebar + topbar layout for all /admin/** pages except /admin/login.
// Pages render inside the <main> content area.

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Главная', icon: Home },
  { href: '/admin/leads', label: 'Заявки', icon: Mail },
  { href: '/admin/blog', label: 'Блог', icon: FileText },
  { href: '/admin/settings', label: 'Настройки', icon: Settings }
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-shrink-0 border-r border-[var(--admin-border)] bg-[var(--admin-surface)] md:block">
        <div className="px-6 py-6">
          <Link href="/admin" className="text-[16px] font-semibold tracking-tight text-[var(--admin-ink)]">
            MakeMeLook <span className="text-[var(--admin-muted)]">/ admin</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/admin' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
                  active
                    ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                    : 'text-[var(--admin-muted)] hover:bg-[var(--admin-bg)] hover:text-[var(--admin-ink)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-6">
          <div className="text-[13px] text-[var(--admin-muted)]">
            {user?.email}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-white px-3 py-1.5 text-[13px] font-medium text-[var(--admin-ink)] transition-colors hover:bg-[var(--admin-bg)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Выйти
          </button>
        </header>

        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
