import type { FC } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Layers,
  Users,
  BarChart2,
  Code2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/shared/api';

const statusConfig = {
  active: {
    label: 'status.active',
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
  },
  draft: {
    label: 'status.draft',
    className: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  },
  paused: {
    label: 'status.paused',
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  },
};

interface Tab {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  end?: boolean;
}

export const Component: FC = () => {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const projectId = Number(id);
  const { data: project } = useProject(projectId);
  const status = project ? statusConfig[project.status] : null;

  const tabs: Tab[] = [
    { label: t(locale, 'tabs.overview'), icon: LayoutDashboard, path: '', end: true },
    { label: t(locale, 'tabs.products'), icon: Package, path: '/products' },
    { label: t(locale, 'tabs.groups'), icon: FolderOpen, path: '/groups' },
    { label: t(locale, 'tabs.widget'), icon: Layers, path: '/widget' },
    { label: t(locale, 'tabs.leads'), icon: Users, path: '/leads' },
    { label: t(locale, 'tabs.analytics'), icon: BarChart2, path: '/analytics' },
    { label: t(locale, 'tabs.installation'), icon: Code2, path: '/installation' },
    { label: t(locale, 'tabs.settings'), icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b bg-background shrink-0 mb-4">
        {/* Project header */}
        <div className="px-6 pt-4 pb-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {project ? (
              <h1 className="text-xl font-semibold truncate">{project.name}</h1>
            ) : (
              <div className="h-7 w-48 bg-muted animate-pulse rounded" />
            )}
            <div className="flex items-center gap-2 mt-1">
              {project ? (
                <span className="text-sm text-muted-foreground truncate">
                  {project.site_url}
                </span>
              ) : (
                <div className="h-4 w-36 bg-muted animate-pulse rounded" />
              )}
              {status && (
                <Badge
                  variant="outline"
                  className={cn('shrink-0', status.className)}
                >
                  {t(locale, status.label as any)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={lp(`/projects/${id}${tab.path}`)}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
                )
              }
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </div>
  );
};
