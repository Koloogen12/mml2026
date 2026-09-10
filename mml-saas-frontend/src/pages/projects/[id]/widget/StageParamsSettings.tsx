import type { FC } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig } from './types';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

export const StageParamsSettings: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  return (
    <div className="ml-11 mt-2 mb-1 space-y-3 p-3 rounded-lg border border-dashed bg-muted/20">
      <div className="space-y-1.5">
        <Label htmlFor="params-title" className="text-xs">
          {t(locale, 'widgetConfig.title')}
        </Label>
        <Input
          id="params-title"
          value={config.params_title}
          onChange={(e) => onChange({ params_title: e.target.value })}
          className="text-sm h-8"
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="params-subtitle" className="text-xs">
          {t(locale, 'widgetConfig.subtitle')}
        </Label>
        <Input
          id="params-subtitle"
          value={config.params_subtitle}
          onChange={(e) => onChange({ params_subtitle: e.target.value })}
          className="text-sm h-8"
          maxLength={120}
        />
      </div>
    </div>
  );
};
