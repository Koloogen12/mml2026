import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import {
  Plus,
  ExternalLink,
  ArrowRight,
  Rocket,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/shared/ui';
import { useProjects, getApiError, type ProjectResponse } from '@/shared/api';
import { generateProjectPlaceholder } from '@/shared/lib/generatePlaceholder';
import { formatDate } from '@/shared/lib/formatDate';

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

// Project Card component
const ProjectCard: FC<{ project: ProjectResponse }> = ({ project }) => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;

  const status = statusConfig[project.status];
  const formattedDate = formatDate(project.created_at, locale);
  const logoUrl = project.logo_url || generateProjectPlaceholder(project.name);

  const handleCardClick = () => {
    navigate(lp(`/projects/${project.id}`));
  };

  return (
    <Card
      onClick={handleCardClick}
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer"
    >
      <div className="p-6">
        {/* Header: Logo + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border shadow-sm">
              <img
                src={logoUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight truncate max-w-[180px]">
                {project.name}
              </h3>
              <a
                href={project.site_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {project.site_url.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <Badge variant="outline" className={status.className}>
            {t(locale, status.label as any)}
          </Badge>
        </div>

        {/* Connected Solutions */}
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-2">{t(locale, 'projects.status')}</div>
          <div className="flex gap-2">
            {project.status === 'active' ? (
              <div className="flex items-center gap-1.5 text-xs bg-primary/5 text-primary px-2.5 py-1 rounded-md border border-primary/10">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t(locale, 'status.readyForProduction')}</span>
              </div>
            ) : project.status === 'draft' ? (
              <span className="text-xs text-muted-foreground italic">
                {t(locale, 'status.setupInProgress')}
              </span>
            ) : (
              <span className="text-xs text-yellow-600 italic">{t(locale, 'status.paused')}</span>
            )}
          </div>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-muted-foreground">{t(locale, 'projects.onboarding')}</span>
            <span className="text-sm font-semibold text-foreground">
              {project.onboarding_completed ? t(locale, 'projects.complete') : t(locale, 'projects.inProgress')}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                project.onboarding_completed
                  ? 'bg-green-500 w-full'
                  : 'bg-primary w-1/2'
              }`}
            />
          </div>
        </div>

        {/* Footer: Created + Action */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            {t(locale, 'projects.created')} {formattedDate}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(lp(`/projects/${project.id}`));
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Empty State component
const EmptyState: FC = () => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;

  const handleCreateProject = () => {
    navigate(lp('/projects/new'));
  };

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="rounded-full bg-primary/10 p-6 mb-6 ring-8 ring-primary/5">
          <Rocket className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">{t(locale, 'projects.noProjects')}</h2>
        <p className="text-muted-foreground mb-8">
          {t(locale, 'projects.noProjectsDesc')}
        </p>
        <Button
          size="lg"
          onClick={handleCreateProject}
          className="cursor-pointer"
        >
          <Plus className="mr-2 w-5 h-5" />
          {t(locale, 'projects.createProject')}
        </Button>
      </div>
    </div>
  );
};

// Loading State component
const LoadingState: FC = () => {
  const locale = useLocale();
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <div className="flex flex-col items-center text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">{t(locale, 'projects.loading')}</p>
      </div>
    </div>
  );
};

// Main Component
export function Component() {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const { data, isLoading, error } = useProjects();
  const projects = data?.projects ?? [];

  const handleCreateProject = () => {
    navigate(lp('/projects/new'));
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title={t(locale, 'projects.title')} />
        <LoadingState />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title={t(locale, 'projects.title')} />
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="flex flex-col items-center text-center max-w-md">
            <p className="text-red-600 mb-4">
              {t(locale, 'projects.loadError')} {getApiError(error).message}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="cursor-pointer"
            >
              {t(locale, 'projects.tryAgain')}
            </Button>
          </div>
        </div>
      </>
    );
  }

  const hasProjects = projects.length > 0;

  if (!hasProjects) {
    return (
      <>
        <PageHeader title={t(locale, 'projects.title')} />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t(locale, 'projects.title')}
        description={t(locale, 'projects.description')}
        actions={
          <Button onClick={handleCreateProject} className="cursor-pointer">
            <Plus className="mr-2 w-4 h-4" />
            {t(locale, 'projects.newProject')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}
