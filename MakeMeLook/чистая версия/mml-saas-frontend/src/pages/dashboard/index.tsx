import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  Activity,
  ArrowRight,
  ExternalLink,
  FolderKanban,
  Settings,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader, EmptyState } from '@/shared/ui';
import { useDashboardStats, useRecentProjects } from '@/shared/api';
import type { ProjectResponse } from '@/shared/api';
import { formatRelativeTime } from '@/shared/lib/formatDate';
import { generateProjectPlaceholder } from '@/shared/lib/generatePlaceholder';

interface ActivityItem {
  id: number;
  type:
    | 'project_created'
    | 'widget_configured'
    | 'lead_received'
    | 'try_on_completed';
  projectName: string;
  timestamp: string;
  metadata?: string;
}

// Build activity feed from recent projects data
function buildActivityFromProjects(projects: ProjectResponse[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  let id = 1;
  for (const p of projects.slice(0, 6)) {
    items.push({
      id: id++,
      type: 'project_created',
      projectName: p.name,
      timestamp: p.created_at,
    });
    if (p.status === 'active') {
      items.push({
        id: id++,
        type: 'widget_configured',
        projectName: p.name,
        timestamp: p.updated_at,
      });
    }
  }
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
}

// KPI Card component
const StatCard: FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  colorClass: string;
}> = ({ title, value, icon, trend, colorClass }) => {
  const hasTrend = trend !== undefined && trend !== 0;
  const isPositive = (trend ?? 0) > 0;

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold">{value}</h3>
            {hasTrend && (
              <span
                className={`text-sm flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {isPositive ? '+' : ''}
                {trend}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colorClass}`}>{icon}</div>
      </div>
    </Card>
  );
};

// Recent Project Card component
const statusConfig = {
  active: {
    label: 'status.active' as const,
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
  },
  draft: {
    label: 'status.draft' as const,
    className: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  },
  paused: {
    label: 'status.paused' as const,
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  },
};

const RecentProjectCard: FC<{ project: ProjectResponse }> = ({ project }) => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;

  const status = statusConfig[project.status as keyof typeof statusConfig];

  const handleCardClick = () => {
    navigate(lp(`/projects/${project.id}`));
  };

  return (
    <Card
      onClick={handleCardClick}
      className="p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border shadow-sm flex-shrink-0">
          <img
            src={project.logo_url ?? generateProjectPlaceholder(project.name)}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{project.name}</h4>
          <a
            href={project.site_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {project.site_url.replace(/^https?:\/\//, '')}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <Badge variant="outline" className={status.className}>
          {t(locale, status.label)}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{t(locale, status.label)}</span>
        <span>{formatRelativeTime(project.updated_at, locale)}</span>
      </div>
    </Card>
  );
};

const activityConfig = {
  project_created: {
    icon: <FolderKanban className="w-4 h-4" />,
    text: 'dashboard.actProjectCreated' as const,
    colorClass: 'bg-blue-500/10 text-blue-600',
  },
  widget_configured: {
    icon: <Settings className="w-4 h-4" />,
    text: 'dashboard.actWidgetConfigured' as const,
    colorClass: 'bg-purple-500/10 text-purple-600',
  },
  lead_received: {
    icon: <Users className="w-4 h-4" />,
    text: 'dashboard.actLeadReceived' as const,
    colorClass: 'bg-green-500/10 text-green-600',
  },
  try_on_completed: {
    icon: <Sparkles className="w-4 h-4" />,
    text: 'dashboard.actTryOnCompleted' as const,
    colorClass: 'bg-orange-500/10 text-orange-600',
  },
};

// Activity Item component
const ActivityItemComponent: FC<{ item: ActivityItem }> = ({ item }) => {
  const locale = useLocale();
  const config = activityConfig[item.type];

  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <div className={`p-2 rounded-lg ${config.colorClass} h-fit`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{t(locale, config.text)}</p>
        <p className="text-xs text-muted-foreground truncate">
          {item.projectName}
          {item.metadata && ` • ${item.metadata}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.timestamp, locale)}</p>
      </div>
    </div>
  );
};

// Quick Action Card component
const QuickActionCard: FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClass: string;
}> = ({ title, description, icon, onClick, colorClass }) => {
  return (
    <Card
      onClick={onClick}
      className="p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${colorClass}`}>{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Card>
  );
};

// Main Component
export function Component() {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;

  const {
    data: stats = {
      totalProjects: 0,
      totalLeads: 0,
      leadsTrend: 0,
      conversionRate: 0,
      conversionRateTrend: 0,
      activeWidgets: 0,
    },
  } = useDashboardStats();

  const { data: recentProjects = [] } = useRecentProjects();

  const activity: ActivityItem[] = buildActivityFromProjects(recentProjects);

  return (
    <>
      <PageHeader
        title={t(locale, 'dashboard.title')}
        description={t(locale, 'dashboard.description')}
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={t(locale, 'dashboard.totalProjects')}
          value={stats.totalProjects}
          icon={<FolderKanban className="w-5 h-5" />}
          colorClass="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title={t(locale, 'dashboard.totalLeads')}
          value={stats.totalLeads}
          icon={<Users className="w-5 h-5" />}
          trend={stats.leadsTrend || undefined}
          colorClass="bg-green-500/10 text-green-600"
        />
        <StatCard
          title={t(locale, 'dashboard.conversionRate')}
          value={`${stats.conversionRate.toFixed(2)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={stats.conversionRateTrend || undefined}
          colorClass="bg-purple-500/10 text-purple-600"
        />
        <StatCard
          title={t(locale, 'dashboard.activeWidgets')}
          value={stats.activeWidgets}
          icon={<Activity className="w-5 h-5" />}
          colorClass="bg-orange-500/10 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Recent Projects + Quick Actions */}
        <div className="xl:col-span-2 space-y-6">
          {/* Recent Projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t(locale, 'dashboard.recentProjects')}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(lp('/projects'))}
                className="cursor-pointer"
              >
                {t(locale, 'dashboard.viewAll')}
                <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
            {recentProjects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title={t(locale, 'dashboard.noProjects')}
                description={t(locale, 'dashboard.noProjectsDesc')}
                actionLabel={t(locale, 'dashboard.createProject')}
                onAction={() => navigate(lp('/projects/new'))}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentProjects.slice(0, 4).map((project) => (
                  <RecentProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t(locale, 'dashboard.quickActions')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuickActionCard
                title={t(locale, 'dashboard.createProject')}
                description={t(locale, 'dashboard.createProjectDesc')}
                icon={<Plus className="w-5 h-5" />}
                onClick={() => navigate(lp('/projects/new'))}
                colorClass="bg-primary/10 text-primary"
              />
              <QuickActionCard
                title={t(locale, 'dashboard.viewProjects')}
                description={t(locale, 'dashboard.viewProjectsDesc')}
                icon={<FolderKanban className="w-5 h-5" />}
                onClick={() => navigate(lp('/projects'))}
                colorClass="bg-blue-500/10 text-blue-600"
              />
              <QuickActionCard
                title={t(locale, 'dashboard.installWidget')}
                description={t(locale, 'dashboard.installWidgetDesc')}
                icon={<Code className="w-5 h-5" />}
                onClick={() => {
                  if (recentProjects.length > 0) {
                    navigate(lp(`/projects/${recentProjects[0].id}/installation`));
                  }
                }}
                colorClass="bg-green-500/10 text-green-600"
              />
              <QuickActionCard
                title={t(locale, 'dashboard.viewAnalytics')}
                description={t(locale, 'dashboard.viewAnalyticsDesc')}
                icon={<TrendingUp className="w-5 h-5" />}
                onClick={() => {
                  if (recentProjects.length > 0) {
                    navigate(lp(`/projects/${recentProjects[0].id}/analytics`));
                  }
                }}
                colorClass="bg-purple-500/10 text-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{t(locale, 'dashboard.recentActivity')}</h2>
          <Card className="p-4">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t(locale, 'dashboard.noActivity')}
              </p>
            ) : (
              <div className="divide-y">
                {activity.map((item) => (
                  <ActivityItemComponent key={item.id} item={item} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
