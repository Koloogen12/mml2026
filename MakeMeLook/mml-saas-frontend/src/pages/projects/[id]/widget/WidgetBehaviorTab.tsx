import type { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MousePointerClick, Save, Globe, Gauge } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig, WidgetLanguage } from './types';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

export const WidgetBehaviorTab: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  return (
    <div className="space-y-6">
      {/* Auto Open */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.autoOpen')}
        </h4>

        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-medium">{t(locale, 'widgetConfig.autoOpenWidget')}</span>
              <p className="text-xs text-muted-foreground">
                {t(locale, 'widgetConfig.autoOpenWidgetDesc')}
              </p>
            </div>
          </div>
          <Switch
            checked={config.auto_open}
            onCheckedChange={(v) => onChange({ auto_open: v })}
          />
        </div>

        {config.auto_open && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">{t(locale, 'widgetConfig.delayBeforeOpening')}</Label>
              <span className="text-sm text-muted-foreground font-mono">
                {config.auto_open_delay}s
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={config.auto_open_delay}
              onChange={(e) =>
                onChange({ auto_open_delay: Number(e.target.value) })
              }
              className="w-full accent-primary h-1.5 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{t(locale, 'widgetConfig.immediately')}</span>
              <span>{t(locale, 'widgetConfig.thirtySeconds')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t" />

      {/* Remember Progress */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.userExperience')}
        </h4>

        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Save className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-medium">{t(locale, 'widgetConfig.rememberProgress')}</span>
              <p className="text-xs text-muted-foreground">
                {t(locale, 'widgetConfig.rememberProgressDesc')}
              </p>
            </div>
          </div>
          <Switch
            checked={config.remember_progress}
            onCheckedChange={(v) => onChange({ remember_progress: v })}
          />
        </div>
      </div>

      <div className="border-t" />

      {/* Language */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.language')}
        </h4>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-sm font-medium">{t(locale, 'widgetConfig.widgetLanguage')}</span>
            <p className="text-xs text-muted-foreground">
              {t(locale, 'widgetConfig.widgetLanguageDesc')}
            </p>
          </div>
        </div>

        <Select
          value={config.language}
          onValueChange={(v: WidgetLanguage) => onChange({ language: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t(locale, 'widgetConfig.langAuto')}</SelectItem>
            <SelectItem value="ru">{t(locale, 'widgetConfig.langRussian')}</SelectItem>
            <SelectItem value="en">{t(locale, 'widgetConfig.langEnglish')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-t" />

      {/* Try-on Limit */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widget.monthlyTryOnLimit')}
        </h4>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <Label htmlFor="monthly-tryon-limit" className="text-sm font-medium">
              {t(locale, 'widget.monthlyTryOnLimit')}
            </Label>
          </div>
        </div>

        <Input
          id="monthly-tryon-limit"
          type="number"
          min={0}
          value={config.monthly_tryon_limit}
          onChange={(e) =>
            onChange({ monthly_tryon_limit: Number(e.target.value) })
          }
        />
      </div>
    </div>
  );
};
