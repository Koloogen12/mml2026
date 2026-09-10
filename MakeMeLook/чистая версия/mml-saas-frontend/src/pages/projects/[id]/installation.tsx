import { type FC, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { WIDGET_CDN_URL } from '@/shared/config';
import type { TranslationKey } from '@/shared/lib/i18n';
import {
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Monitor,
  Globe,
  Settings2,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/shared/ui/page-header';
import { CopyButton } from '@/shared/ui/copy-button';
import {
  getApiError,
  useProject,
  useWidgetCode,
  useReadiness,
  useDiagnostics,
  useRunDiagnostics,
  installationApi,
} from '@/shared/api';
import type { DiagnosticCheck as DiagnosticCheckType } from '@/shared/api';
import { cn } from '@/lib/utils';

const CHECK_STATUS_ICON: Record<
  DiagnosticCheckType['status'],
  { icon: typeof CheckCircle2; color: string }
> = {
  pass: { icon: CheckCircle2, color: 'text-emerald-500' },
  fail: { icon: Circle, color: 'text-red-500' },
  warn: { icon: Circle, color: 'text-amber-500' },
  pending: { icon: Circle, color: 'text-muted-foreground/30' },
};

const CMS_KEYS: { key: string; titleKey: TranslationKey; stepKeys: TranslationKey[] }[] = [
  {
    key: 'general',
    titleKey: 'installation.generalTitle',
    stepKeys: [
      'installation.generalStep1',
      'installation.generalStep2',
      'installation.generalStep3',
      'installation.generalStep4',
      'installation.generalStep5',
      'installation.generalStep6',
    ],
  },
  {
    key: 'cscart',
    titleKey: 'installation.cscartTitle',
    stepKeys: [
      'installation.cscartStep1',
      'installation.cscartStep2',
      'installation.cscartStep3',
      'installation.cscartStep4',
      'installation.cscartStep5',
    ],
  },
  {
    key: 'bitrix',
    titleKey: 'installation.bitrixTitle',
    stepKeys: [
      'installation.bitrixStep1',
      'installation.bitrixStep2',
      'installation.bitrixStep3',
      'installation.bitrixStep4',
      'installation.bitrixStep5',
    ],
  },
  {
    key: 'wordpress',
    titleKey: 'installation.wordpressTitle',
    stepKeys: [
      'installation.wordpressStep1',
      'installation.wordpressStep2',
      'installation.wordpressStep3',
      'installation.wordpressStep4',
      'installation.wordpressStep5',
    ],
  },
  {
    key: 'shopify',
    titleKey: 'installation.shopifyTitle',
    stepKeys: [
      'installation.shopifyStep1',
      'installation.shopifyStep2',
      'installation.shopifyStep3',
      'installation.shopifyStep4',
      'installation.shopifyStep5',
    ],
  },
  {
    key: 'tilda',
    titleKey: 'installation.tildaTitle',
    stepKeys: [
      'installation.tildaStep1',
      'installation.tildaStep2',
      'installation.tildaStep3',
      'installation.tildaStep4',
      'installation.tildaStep5',
    ],
  },
  {
    key: 'insales',
    titleKey: 'installation.insalesTitle',
    stepKeys: [
      'installation.insalesStep1',
      'installation.insalesStep2',
      'installation.insalesStep3',
      'installation.insalesStep4',
      'installation.insalesStep5',
    ],
  },
];

const ReadinessItem: FC<{
  done: boolean;
  label: string;
}> = ({ done, label }) => (
  <div className="flex items-center gap-3 py-1.5">
    {done ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
    ) : (
      <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
    )}
    <span
      className={cn(
        'text-sm',
        done ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
    </span>
  </div>
);

const DiagnosticCheckItem: FC<{ check: DiagnosticCheckType }> = ({ check }) => {
  const cfg = CHECK_STATUS_ICON[check.status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-1">
      <Icon className={cn('w-4 h-4 flex-shrink-0', cfg.color)} />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground">{check.message}</span>
        {check.detail && (
          <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
        )}
      </div>
    </div>
  );
};

export const Component: FC = () => {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const projectId = Number(id);

  const {
    data: project,
    isLoading: pLoad,
    error,
  } = useProject(projectId, Boolean(id));
  const { data: widgetCode, isLoading: wLoad } = useWidgetCode(
    projectId,
    Boolean(id),
  );
  const { data: readiness, isLoading: rLoad } = useReadiness(
    projectId,
    Boolean(id),
  );
  const { data: diagnostics, isLoading: diagLoad } = useDiagnostics(
    projectId,
    Boolean(id),
  );
  const runDiagnostics = useRunDiagnostics(projectId);
  const [addonDownloading, setAddonDownloading] = useState(false);

  const handleDownloadCSCartAddon = async () => {
    setAddonDownloading(true);
    try {
      await installationApi.downloadCSCartAddon(projectId);
    } finally {
      setAddonDownloading(false);
    }
  };

  const isLoading = pLoad || wLoad || rLoad;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">
            {t(locale, 'installation.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (error || !project || !readiness) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center text-center max-w-md">
          <p className="text-red-600 mb-4">
            {error ? getApiError(error).message : t(locale, 'installation.loadError')}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="cursor-pointer"
          >
            {t(locale, 'installation.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  const publicId = widgetCode?.project_id ?? project.public_id;
  const cdnUrl =
    widgetCode?.cdn_url ?? WIDGET_CDN_URL;
  const snippetCode = `<!-- MakeMeLook Virtual Try-On Widget -->\n<script\n  src="${cdnUrl}/loader.js"\n  data-project="${publicId}"\n  async\n></script>`;
  const hasDomains = readiness.has_domain;
  const domainDiagnostics = diagnostics?.domains ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(locale, 'installation.title')}
        description={t(locale, 'installation.description')}
      />

      {/* Readiness */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{t(locale, 'installation.readiness')}</h3>
          {readiness.all_ready && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {t(locale, 'installation.ready')}
            </Badge>
          )}
        </div>
        <div className="space-y-0.5">
          <ReadinessItem
            done={readiness.widget_configured}
            label={t(locale, 'installation.widgetConfigured')}
          />
          <ReadinessItem
            done={readiness.active_products > 0}
            label={
              readiness.active_products > 0
                ? `${t(locale, 'installation.productsUploaded')} (${readiness.active_products} ${t(locale, 'installation.productsActive')})`
                : t(locale, 'installation.uploadAtLeastOne')
            }
          />
          <ReadinessItem
            done={readiness.has_domain}
            label={
              readiness.has_domain
                ? t(locale, 'installation.domainAdded')
                : t(locale, 'installation.addDomainInSettings')
            }
          />
        </div>
      </Card>

      {/* Widget Code */}
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-1">{t(locale, 'installation.widgetCode')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t(locale, 'installation.widgetCodeDesc')}{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
            {'</body>'}
          </code>{' '}
          {t(locale, 'installation.widgetCodeDescEnd')}
        </p>

        <div className="relative rounded-lg bg-zinc-950 p-4 pr-14">
          <pre className="text-sm font-mono whitespace-pre overflow-x-auto leading-relaxed">
            <span className="text-zinc-500">
              {'<!-- MakeMeLook Virtual Try-On Widget -->'}
            </span>
            {'\n'}
            <span className="text-red-400">{'<script'}</span>
            {'\n  '}
            <span className="text-amber-300">src</span>
            <span className="text-zinc-500">=</span>
            <span className="text-emerald-400">
              {`"${cdnUrl}/loader.js"`}
            </span>
            {'\n  '}
            <span className="text-amber-300">data-project</span>
            <span className="text-zinc-500">=</span>
            <span className="text-emerald-400">{`"${publicId}"`}</span>
            {'\n  '}
            <span className="text-amber-300">async</span>
            {'\n'}
            <span className="text-red-400">{'></script>'}</span>
          </pre>
          <div className="absolute top-3 right-3">
            <CopyButton text={snippetCode} />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium mb-3">{t(locale, 'installation.instructions')}</p>
          <Tabs defaultValue="general">
            <TabsList className="flex-wrap h-auto gap-1">
              {CMS_KEYS.map((cms) => (
                <TabsTrigger key={cms.key} value={cms.key} className="text-xs">
                  {t(locale, cms.titleKey)}
                </TabsTrigger>
              ))}
            </TabsList>
            {CMS_KEYS.map((cms) => (
              <TabsContent key={cms.key} value={cms.key} className="mt-4">
                {cms.key === 'cscart' && (
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={addonDownloading}
                      onClick={handleDownloadCSCartAddon}
                      className="cursor-pointer"
                    >
                      {addonDownloading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {t(locale, 'installation.cscartDownloadAddon')}
                    </Button>
                  </div>
                )}
                <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
                  {cms.stepKeys.map((stepKey, i) => (
                    <li key={i} className="leading-relaxed pl-1">
                      {t(locale, stepKey)}
                    </li>
                  ))}
                </ol>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Card>

      {/* Diagnostics */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{t(locale, 'installation.diagnostics')}</h3>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasDomains || runDiagnostics.isPending}
            onClick={() => runDiagnostics.mutate()}
            className="cursor-pointer"
          >
            <RefreshCw
              className={cn(
                'w-4 h-4 mr-2',
                runDiagnostics.isPending && 'animate-spin',
              )}
            />
            {runDiagnostics.isPending ? t(locale, 'installation.running') : t(locale, 'installation.runCheck')}
          </Button>
        </div>

        {!hasDomains ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Globe className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              {t(locale, 'installation.noDomainsConfigured')}
            </p>
            <p className="text-xs text-muted-foreground/70 mb-4">
              {t(locale, 'installation.addDomainForDiag')}{' '}
              <Link
                to={lp(`/projects/${id}/settings`)}
                className="text-primary underline underline-offset-2"
              >
                {t(locale, 'installation.settingsLink')}
              </Link>{' '}
              {t(locale, 'installation.toRunDiagnostics')}
            </p>
          </div>
        ) : diagLoad ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : domainDiagnostics.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t(locale, 'installation.noDiagnosticsYet')}
          </p>
        ) : (
          <div className="space-y-6">
            {domainDiagnostics.map((dd) => (
              <div key={dd.domain}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{dd.domain}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        dd.status === 'ok' &&
                          'border-emerald-500/30 text-emerald-600',
                        dd.status === 'error' &&
                          'border-red-500/30 text-red-600',
                        dd.status === 'warning' &&
                          'border-amber-500/30 text-amber-600',
                      )}
                    >
                      {dd.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {dd.checked_at
                      ? `${t(locale, 'installation.checked')} ${new Date(dd.checked_at).toLocaleString()}`
                      : t(locale, 'installation.notCheckedYet')}
                  </span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {dd.checks.map((check) => (
                    <DiagnosticCheckItem key={check.name} check={check} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Test Mode */}
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4">{t(locale, 'installation.testMode')}</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ExternalLink className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-0.5">{t(locale, 'installation.previewPage')}</p>
              <p className="text-xs text-muted-foreground mb-2">
                {t(locale, 'installation.previewPageDesc')}
              </p>
              <a
                href={`${import.meta.env.VITE_PREVIEW_URL || 'https://preview.makemelook.ai'}/${project.public_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
              >
                {(import.meta.env.VITE_PREVIEW_URL || 'preview.makemelook.ai').replace(/^https?:\/\//, '')}/{project.public_id}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Settings2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-0.5">{t(locale, 'installation.widgetConfigurator')}</p>
              <p className="text-xs text-muted-foreground mb-2">
                {t(locale, 'installation.widgetConfiguratorDesc')}
              </p>
              <Link
                to={lp(`/projects/${id}/widget`)}
                className="text-xs text-primary hover:underline underline-offset-2"
              >
                {t(locale, 'installation.openConfigurator')}
              </Link>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Monitor className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-0.5">{t(locale, 'installation.localhost')}</p>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">
                  localhost
                </code>{' '}
                {t(locale, 'installation.localhostDesc')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
