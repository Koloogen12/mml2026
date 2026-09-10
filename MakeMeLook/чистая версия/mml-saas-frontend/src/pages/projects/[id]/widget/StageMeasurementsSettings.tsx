import type { FC } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig } from './types';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

export const StageMeasurementsSettings: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  return (
    <div className="ml-11 mt-2 mb-1 space-y-3 p-3 rounded-lg border border-dashed bg-muted/20">
      <div className="space-y-1.5">
        <Label htmlFor="measurements-title" className="text-xs">
          {t(locale, 'widgetConfig.title')}
        </Label>
        <Input
          id="measurements-title"
          value={config.measurements_title}
          onChange={(e) => onChange({ measurements_title: e.target.value })}
          className="text-sm h-8"
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="measurements-subtitle" className="text-xs">
          {t(locale, 'widgetConfig.subtitle')}
        </Label>
        <Input
          id="measurements-subtitle"
          value={config.measurements_subtitle}
          onChange={(e) => onChange({ measurements_subtitle: e.target.value })}
          className="text-sm h-8"
          maxLength={120}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t(locale, 'widgetConfig.showSizeSelector')}</Label>
        <Switch
          checked={config.stages_enabled.size}
          onCheckedChange={(checked) =>
            onChange({
              stages_enabled: {
                ...config.stages_enabled,
                size: checked,
              },
            })
          }
        />
      </div>
    </div>
  );
};
