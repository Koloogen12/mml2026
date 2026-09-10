import { useState } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import {
  Check,
  X,
  TrendingUp,
  Users,
  UserPlus,
  BarChart,
  ArrowUp,
  Circle,
  Settings,
  LineChart,
  MessageSquare,
  Presentation,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getApiError,
  useProject,
  useProjectOnboarding,
  useProjectStats,
  type OnboardingStatusResponse,
} from '@/shared/api';

// Progress component (if not available in UI components)
const Progress: FC<{ value: number; className?: string }> = ({
  value,
  className = '',
}) => (
  <div
    className={`w-full bg-muted rounded-full h-2 overflow-hidden ${className}`}
  >
    <div
      className="bg-primary h-full transition-all duration-300"
      style={{ width: `${value}%` }}
    />
  </div>
);

// Onboarding Checklist Component
const OnboardingChecklist: FC<{
  onboarding: OnboardingStatusResponse;
  projectId: string;
  onDismiss: () => void;
}> = ({ onboarding, projectId, onDismiss }) => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;

  const steps = [
    {
      id: 'project',
      title: t(locale, 'projectOverview.createProject'),
      completed: onboarding.project_created,
      clickable: false,
    },
    {
      id: 'widget',
      title: t(locale, 'projectOverview.configureWidget'),
      completed: onboarding.widget_configured,
      clickable: true,
      path: `/projects/${projectId}/widget`,
    },
    {
      id: 'products',
      title: t(locale, 'projectOverview.uploadProducts'),
      subtitle: onboarding.products_added
        ? t(locale, 'projectOverview.completeBadge')
        : t(locale, 'projectOverview.uploadAtLeast5'),
      completed: onboarding.products_added,
      clickable: true,
      path: `/projects/${projectId}/products`,
    },
    {
      id: 'code',
      title: t(locale, 'projectOverview.installCode'),
      completed: onboarding.code_viewed,
      clickable: true,
      path: `/projects/${projectId}/installation`,
    },
    {
      id: 'tryon',
      title: t(locale, 'projectOverview.firstTryOn'),
      subtitle: t(locale, 'projectOverview.autoCompleted'),
      completed: onboarding.first_try_on,
      clickable: false,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progress = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t(locale, 'projectOverview.gettingStarted')}</h3>
          <p className="text-sm text-muted-foreground">
            {isComplete
              ? t(locale, 'projectOverview.allSet')
              : t(locale, 'projectOverview.completeSteps')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {completedCount} {t(locale, 'projectOverview.ofCompleted')} {totalCount} {t(locale, 'projectOverview.completed')}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => step.clickable && step.path && navigate(lp(step.path))}
            disabled={!step.clickable || step.completed}
            className={`
              w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left
              ${
                step.clickable && !step.completed
                  ? 'hover:bg-muted/50 cursor-pointer'
                  : ''
              }
              ${step.completed ? 'opacity-60' : ''}
            `}
          >
            <div
              className={`
                flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
                ${
                  step.completed
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground'
                }
              `}
            >
              {step.completed && (
                <Check className="w-3 h-3 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div
                className={`text-sm font-medium ${step.completed ? 'line-through' : ''}`}
              >
                {step.title}
              </div>
              {step.subtitle && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {step.subtitle}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {isComplete && (
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary">{t(locale, 'projectOverview.completeBadge')}</Badge>
            <span className="text-sm font-medium">
              {t(locale, 'projectOverview.fullySetUp')}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

// Stat Card Component
const StatCard: FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  accentColor: string;
}> = ({ icon, label, value, trend, accentColor }) => {
  const trendPositive = trend && trend > 0;
  const trendNegative = trend && trend < 0;

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentColor}`}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trendPositive
                ? 'text-green-600'
                : trendNegative
                  ? 'text-red-600'
                  : 'text-muted-foreground'
            }`}
          >
            {trendPositive && <ArrowUp className="w-3 h-3" />}
            {trendNegative && <ArrowUp className="w-3 h-3 rotate-180" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  );
};

// Solution Row Component
const SolutionRow: FC<{
  icon: React.ReactNode;
  title: string;
  status: 'active' | 'inactive';
  onConfigure?: () => void;
  onAnalytics?: () => void;
  disabled?: boolean;
}> = ({ icon, title, status, onConfigure, onAnalytics, disabled }) => {
  const locale = useLocale();
  const isActive = status === 'active';

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {icon}
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Circle
              className={`w-2 h-2 fill-current ${
                isActive ? 'text-green-500' : 'text-gray-400'
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {isActive ? t(locale, 'status.active') : t(locale, 'status.notConnected')}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onConfigure && (
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            disabled={disabled}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t(locale, 'projectOverview.configure')}
          </Button>
        )}
        {onAnalytics && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAnalytics}
            disabled={disabled}
          >
            <LineChart className="w-4 h-4 mr-2" />
            {t(locale, 'projectOverview.analytics')}
          </Button>
        )}
        {!isActive && (
          <Button variant="outline" size="sm" disabled>
            {t(locale, 'projectOverview.learnMore')}
          </Button>
        )}
      </div>
    </div>
  );
};

// Main Component
export const Component: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const [showOnboarding, setShowOnboarding] = useState(true);
  const projectId = Number(id);

  const {
    data: project,
    isLoading: pLoad,
    error,
  } = useProject(projectId, Boolean(id));
  const { data: onboarding, isLoading: oLoad } = useProjectOnboarding(
    projectId,
    Boolean(id),
  );
  const { data: stats, isLoading: sLoad } = useProjectStats(
    projectId,
    Boolean(id),
  );

  const isLoading = pLoad || oLoad || sLoad;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">{t(locale, 'projectOverview.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !project || !onboarding || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center text-center max-w-md">
          <p className="text-red-600 mb-4">
            {error ? getApiError(error).message : t(locale, 'projectOverview.loadError')}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="cursor-pointer"
          >
            {t(locale, 'projectOverview.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  const onboardingComplete =
    onboarding.project_created &&
    onboarding.widget_configured &&
    onboarding.products_added &&
    onboarding.code_viewed &&
    onboarding.first_try_on;

  return (
    <div className="space-y-6">
      {/* Onboarding Checklist */}
      {showOnboarding && !onboardingComplete && (
        <OnboardingChecklist
          onboarding={onboarding}
          projectId={id!}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}

      {/* Quick Stats */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">{t(locale, 'projectOverview.quickStats')}</h3>
            <p className="text-sm text-muted-foreground">{t(locale, 'projectOverview.last7days')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t(locale, 'projectOverview.tryOns')}
            value={stats.try_ons.toLocaleString()}
            accentColor="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label={t(locale, 'projectOverview.leads')}
            value={stats.leads.toLocaleString()}
            accentColor="bg-green-500/10 text-green-600"
          />
          <StatCard
            icon={<UserPlus className="w-5 h-5" />}
            label={t(locale, 'projectOverview.conversions')}
            value={stats.conversions.toLocaleString()}
            accentColor="bg-purple-500/10 text-purple-600"
          />
          <StatCard
            icon={<BarChart className="w-5 h-5" />}
            label={t(locale, 'projectOverview.conversionRate')}
            value={`${stats.conversion_rate.toFixed(2)}%`}
            accentColor="bg-orange-500/10 text-orange-600"
          />
        </div>
      </Card>

      {/* Solutions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">{t(locale, 'projectOverview.solutions')}</h3>
        <div className="space-y-3">
          <SolutionRow
            icon={<TrendingUp className="w-5 h-5" />}
            title={t(locale, 'wizard.tryOnWidget')}
            status="active"
            onConfigure={() => navigate(lp(`/projects/${id}/widget`))}
            onAnalytics={() => navigate(lp(`/projects/${id}/analytics`))}
          />
          <SolutionRow
            icon={<MessageSquare className="w-5 h-5" />}
            title={t(locale, 'wizard.aiStylist')}
            status="inactive"
            disabled
          />
          <SolutionRow
            icon={<Presentation className="w-5 h-5" />}
            title={t(locale, 'wizard.showRoomPages')}
            status="inactive"
            disabled
          />
        </div>
      </Card>
    </div>
  );
};
