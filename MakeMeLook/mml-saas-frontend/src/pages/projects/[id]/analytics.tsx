import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import {
  Eye,
  MousePointerClick,
  Sparkles,
  Users,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ArrowDownRight,
  Calendar,
  DollarSign,
  Receipt,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/shared/ui/page-header';
import { Spinner } from '@/shared/ui/spinner';
import { cn } from '@/lib/utils';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import {
  useAnalyticsSummary,
  useAnalyticsFunnel,
  useAnalyticsTrends,
  useAnalyticsTopProducts,
  useAnalyticsAudience,
} from '@/shared/api/analytics.queries';
import type { AnalyticsSummary, AnalyticsKPI } from '@/shared/api/analytics';
import type { TranslationKey } from '@/shared/lib/i18n';

// ── Period selector ──────────────────────────────────────────────

type Period = '1d' | '7d' | '30d' | '90d';

const periodLabelKeys: Record<Period, TranslationKey> = {
  '1d': 'analytics.periodToday',
  '7d': 'analytics.period7d',
  '30d': 'analytics.period30d',
  '90d': 'analytics.period90d',
};

const FUNNEL_LABELS: Record<string, TranslationKey> = {
  view: 'analytics.funnelView',
  open: 'analytics.funnelOpen',
  params: 'analytics.funnelParams',
  photo: 'analytics.funnelPhoto',
  first_tryon: 'analytics.funnelFirstTryon',
  repeat_tryon: 'analytics.funnelRepeatTryon',
  favorite: 'analytics.funnelFavorite',
  cart: 'analytics.funnelCart',
};

const DEVICE_LABELS: Record<string, TranslationKey> = {
  Mobile: 'analytics.deviceMobile',
  Tablet: 'analytics.deviceTablet',
  Desktop: 'analytics.deviceDesktop',
  Other: 'analytics.deviceOther',
};

// ── Chart palette ────────────────────────────────────────────────

const CHART_COLORS = {
  primary: '#6d28d9',
  teal: '#0d9488',
  amber: '#d97706',
  rose: '#e11d48',
  sky: '#0284c7',
  emerald: '#059669',
  slate: '#64748b',
};

const PIE_COLORS = [
  CHART_COLORS.rose,
  CHART_COLORS.sky,
  CHART_COLORS.slate,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
];

// ── Trend metric config ──────────────────────────────────────────

type TrendMetric = 'views' | 'opens' | 'tryon' | 'leads' | 'cart';

const trendMetrics: { key: TrendMetric; labelKey: TranslationKey; color: string }[] = [
  { key: 'views', labelKey: 'analytics.trendViews', color: CHART_COLORS.sky },
  { key: 'opens', labelKey: 'analytics.trendOpens', color: CHART_COLORS.primary },
  { key: 'tryon', labelKey: 'analytics.trendTryOns', color: CHART_COLORS.amber },
  { key: 'leads', labelKey: 'analytics.trendLeads', color: CHART_COLORS.emerald },
  { key: 'cart', labelKey: 'analytics.trendCart', color: CHART_COLORS.teal },
];

// ── KPI card config ──────────────────────────────────────────────

const kpiConfig: {
  key: keyof AnalyticsSummary;
  labelKey: TranslationKey;
  icon: React.ElementType;
  accent: string;
  isPercent?: boolean;
  isCurrency?: boolean;
}[] = [
  {
    key: 'views',
    labelKey: 'analytics.widgetViews',
    icon: Eye,
    accent: 'bg-sky-500/10 text-sky-600',
  },
  {
    key: 'opens',
    labelKey: 'analytics.widgetOpens',
    icon: MousePointerClick,
    accent: 'bg-violet-500/10 text-violet-600',
  },
  {
    key: 'tryons',
    labelKey: 'analytics.tryOnSessions',
    icon: Sparkles,
    accent: 'bg-amber-500/10 text-amber-600',
  },
  {
    key: 'leads',
    labelKey: 'analytics.uniqueLeads',
    icon: Users,
    accent: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    key: 'conversion',
    labelKey: 'analytics.conversion',
    icon: TrendingUp,
    accent: 'bg-rose-500/10 text-rose-600',
    isPercent: true,
  },
  {
    key: 'cart_items',
    labelKey: 'analytics.cartAdditions',
    icon: ShoppingCart,
    accent: 'bg-teal-500/10 text-teal-600',
  },
  {
    key: 'revenue',
    labelKey: 'analytics.revenue',
    icon: DollarSign,
    accent: 'bg-green-500/10 text-green-600',
    isCurrency: true,
  },
  {
    key: 'aov',
    labelKey: 'analytics.aov',
    icon: Receipt,
    accent: 'bg-indigo-500/10 text-indigo-600',
    isCurrency: true,
  },
];

// ── Sub-components ───────────────────────────────────────────────

const KpiCard: FC<{
  label: string;
  value: string;
  trend: number;
  icon: React.ElementType;
  accent: string;
  vsPrevPeriodLabel: string;
}> = ({ label, value, trend, icon: Icon, accent, vsPrevPeriodLabel }) => {
  const positive = trend > 0;
  return (
    <Card className="py-5 gap-4 hover:shadow-md transition-shadow">
      <CardContent className="px-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-2">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-none">
              {value}
            </p>
          </div>
          <div className={cn('p-2.5 rounded-lg shrink-0', accent)}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {positive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              positive ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {positive ? '+' : ''}
            {trend}%
          </span>
          <span className="text-xs text-muted-foreground">{vsPrevPeriodLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const FunnelBar: FC<{
  label: string;
  count: number;
  pct: number;
  isMaxDrop: boolean;
  prevCount?: number;
}> = ({ label, count, pct, isMaxDrop, prevCount }) => {
  const dropPct =
    prevCount !== undefined && prevCount > 0
      ? Math.round(((prevCount - count) / prevCount) * 100)
      : 0;

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-36 shrink-0 text-right">
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 relative">
        <div className="h-8 bg-muted rounded-md overflow-hidden">
          <div
            className={cn(
              'h-full rounded-md transition-all duration-500',
              isMaxDrop
                ? 'bg-rose-500/80'
                : 'bg-primary/70 group-hover:bg-primary/85',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="w-20 shrink-0 text-right tabular-nums">
        <span className="text-sm font-semibold">{count.toLocaleString()}</span>
      </div>
      <div className="w-14 shrink-0 text-right tabular-nums">
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="w-16 shrink-0 text-right">
        {dropPct > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
            <ArrowDownRight className="w-3 h-3" />
            {dropPct}%
          </span>
        )}
      </div>
    </div>
  );
};

const CustomTooltip: FC<{
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm font-semibold"
          style={{ color: entry.color }}
        >
          {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

function renderPieLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  const p = props as unknown as Record<string, unknown>;
  const payload = p.payload as Record<string, unknown> | undefined;
  const name = (p.name as string) ?? (payload?.name as string) ?? '';
  const RADIAN = Math.PI / 180;
  const cxN = Number(cx);
  const cyN = Number(cy);
  const r = Number(outerRadius) + 20;
  const angle = Number(midAngle);
  const x = cxN + r * Math.cos(-angle * RADIAN);
  const y = cyN + r * Math.sin(-angle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cxN ? 'start' : 'end'}
      dominantBaseline="central"
      className="fill-foreground text-xs font-medium"
    >
      {String(name)} {(Number(percent) * 100).toFixed(0)}%
    </text>
  );
}

// ── Top Products Tab Sort Key ────────────────────────────────────

type TopSortKey = 'tryon' | 'favorites' | 'cart';

const topTabConfig: { value: TopSortKey; labelKey: TranslationKey }[] = [
  { value: 'tryon', labelKey: 'analytics.topTryOns' },
  { value: 'favorites', labelKey: 'analytics.topFavorites' },
  { value: 'cart', labelKey: 'analytics.topCart' },
];

// ── Main component ───────────────────────────────────────────────

export const Component: FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const locale = useLocale();

  const [period, setPeriod] = useState<Period>('30d');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('tryon');
  const [topSort, setTopSort] = useState<TopSortKey>('tryon');

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(
    projectId,
    period,
  );
  const { data: funnel } = useAnalyticsFunnel(projectId, period);
  const { data: trends } = useAnalyticsTrends(projectId, period, trendMetric);
  const { data: topProducts } = useAnalyticsTopProducts(
    projectId,
    period,
    topSort,
  );
  const { data: audience } = useAnalyticsAudience(projectId, period);

  const activeMetric = trendMetrics.find((m) => m.key === trendMetric)!;

  // Transform trend data for recharts
  const trendChartData = useMemo(() => {
    if (!trends?.points) return [];
    const dateLocale = t(locale, 'analytics.dateLocale');
    return trends.points.map((p) => ({
      date: new Date(p.date).toLocaleDateString(dateLocale, {
        month: 'short',
        day: 'numeric',
      }),
      value: p.value,
    }));
  }, [trends, locale]);

  // Compute max funnel drop-off
  const funnelStages = funnel?.stages ?? [];
  const maxDropoffIdx = useMemo(() => {
    const drops = funnelStages.map((s, i) =>
      i === 0 ? 0 : funnelStages[i - 1].count - s.count,
    );
    return drops.indexOf(Math.max(...drops.slice(1)));
  }, [funnelStages]);

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={t(locale, 'analytics.title')}
        description={t(locale, 'analytics.description')}
        actions={
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-auto gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.entries(periodLabelKeys) as [Period, TranslationKey][]).map(([key, labelKey]) => (
                <SelectItem key={key} value={key}>
                  {t(locale, labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {summary &&
          kpiConfig.map((kpi) => {
            const data = summary[kpi.key as keyof AnalyticsSummary] as AnalyticsKPI | undefined;
            if (!data) return null;
            const currencySymbol = t(locale, 'analytics.currencySymbol');
            const displayValue = kpi.isPercent
              ? `${data.value}%`
              : kpi.isCurrency
                ? `${data.value.toLocaleString()} ${currencySymbol}`
                : data.value.toLocaleString();
            return (
              <KpiCard
                key={kpi.key}
                label={t(locale, kpi.labelKey)}
                value={displayValue}
                trend={data.trend}
                icon={kpi.icon}
                accent={kpi.accent}
                vsPrevPeriodLabel={t(locale, 'analytics.vsPrevPeriod')}
              />
            );
          })}
      </div>

      {/* ── Conversion Funnel ────────────────────────────────── */}
      {funnelStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t(locale, 'analytics.conversionFunnel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelStages.map((stage, i) => (
                <FunnelBar
                  key={stage.key}
                  label={t(locale, FUNNEL_LABELS[stage.key] || (stage.key as TranslationKey))}
                  count={stage.count}
                  pct={stage.pct}
                  isMaxDrop={i === maxDropoffIdx}
                  prevCount={i > 0 ? funnelStages[i - 1].count : undefined}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-500/80" />
              {t(locale, 'analytics.biggestDropOff')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Trends ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">{t(locale, 'analytics.trends')}</CardTitle>
          <div className="flex gap-1">
            {trendMetrics.map((m) => (
              <Button
                key={m.key}
                variant={trendMetric === m.key ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setTrendMetric(m.key)}
                className="cursor-pointer"
              >
                {t(locale, m.labelKey)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  stroke="var(--color-muted-foreground)"
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={activeMetric.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Top Products + Audience ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <Tabs
            value={topSort}
            onValueChange={(v) => setTopSort(v as TopSortKey)}
          >
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">{t(locale, 'analytics.topProducts')}</CardTitle>
              <TabsList>
                {topTabConfig.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {t(locale, tab.labelKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>
            <CardContent>
              {topTabConfig.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-0">
                  <div className="space-y-0 divide-y">
                    {(topProducts?.products ?? []).map((p, i) => {
                      const metricValue =
                        tab.value === 'tryon'
                          ? p.tryons
                          : tab.value === 'favorites'
                            ? p.favorites
                            : p.cart;
                      return (
                        <div
                          key={p.product_id}
                          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <span className="w-5 text-xs text-muted-foreground text-right tabular-nums">
                            {i + 1}
                          </span>
                          <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-base shrink-0 overflow-hidden">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </span>
                          <span className="flex-1 text-sm font-medium truncate">
                            {p.name}
                          </span>
                          <span className="text-sm tabular-nums font-semibold w-12 text-right">
                            {metricValue}
                          </span>
                        </div>
                      );
                    })}
                    {(!topProducts?.products ||
                      topProducts.products.length === 0) && (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {t(locale, 'analytics.noDataYet')}
                      </p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>

        {/* Audience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gender */}
          <Card className="py-4 gap-3">
            <CardHeader className="py-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, 'analytics.gender')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {audience?.gender && audience.gender.length > 0 ? (
                <PieChart width={180} height={140}>
                  <Pie
                    data={audience.gender}
                    cx={90}
                    cy={70}
                    innerRadius={36}
                    outerRadius={56}
                    dataKey="value"
                    nameKey="name"
                    label={renderPieLabel}
                    labelLine={false}
                    strokeWidth={0}
                  >
                    {audience.gender.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <p className="text-sm text-muted-foreground py-8">{t(locale, 'analytics.noData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Devices */}
          <Card className="py-4 gap-3">
            <CardHeader className="py-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, 'analytics.devices')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {audience?.devices && audience.devices.length > 0 ? (
                <PieChart width={180} height={140}>
                  <Pie
                    data={audience.devices.map((d) => ({
                      ...d,
                      name: DEVICE_LABELS[d.name]
                        ? t(locale, DEVICE_LABELS[d.name])
                        : d.name,
                    }))}
                    cx={90}
                    cy={70}
                    innerRadius={36}
                    outerRadius={56}
                    dataKey="value"
                    nameKey="name"
                    label={renderPieLabel}
                    labelLine={false}
                    strokeWidth={0}
                  >
                    {audience.devices.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <p className="text-sm text-muted-foreground py-8">{t(locale, 'analytics.noData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Sizes */}
          <Card className="py-4 gap-3">
            <CardHeader className="py-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, 'analytics.sizes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32">
                {audience?.sizes && audience.sizes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={audience.sizes} barSize={20}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        stroke="var(--color-muted-foreground)"
                      />
                      <YAxis hide />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.primary}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center pt-12">
                    {t(locale, 'analytics.noData')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Figure Types */}
          <Card className="py-4 gap-3">
            <CardHeader className="py-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, 'analytics.figureTypes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32">
                {audience?.figure_types && audience.figure_types.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={audience.figure_types} barSize={18}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        stroke="var(--color-muted-foreground)"
                      />
                      <YAxis hide />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.teal}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center pt-12">
                    {t(locale, 'analytics.noData')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
