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

export const StageBellySettings: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  return (
    <div className="ml-11 mt-2 mb-1 space-y-3 p-3 rounded-lg border border-dashed bg-muted/20">
      <div className="space-y-1.5">
        <Label htmlFor="belly-title" className="text-xs">
          {t(locale, 'widgetConfig.title')}
        </Label>
        <Input
          id="belly-title"
          value={config.belly_title}
          onChange={(e) => onChange({ belly_title: e.target.value })}
          className="text-sm h-8"
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="belly-subtitle" className="text-xs">
          {t(locale, 'widgetConfig.subtitle')}
        </Label>
        <Input
          id="belly-subtitle"
          value={config.belly_subtitle}
          onChange={(e) => onChange({ belly_subtitle: e.target.value })}
          className="text-sm h-8"
          maxLength={120}
        />
      </div>
    </div>
  );
};
