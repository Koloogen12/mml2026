import type { FC } from 'react';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import { PRESETS } from './types';
import type { WidgetConfig } from './types';

interface Props {
  currentConfig: WidgetConfig;
  onApply: (presetId: string) => void;
}

export const WidgetPresets: FC<Props> = ({ currentConfig, onApply }) => {
  const locale = useLocale();

  const isPresetActive = (presetId: string): boolean => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;
    return Object.entries(preset.config).every(
      ([key, value]) => currentConfig[key as keyof WidgetConfig] === value,
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t(locale, 'widgetConfig.quickPresets')}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => {
          const active = isPresetActive(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset.id)}
              className={cn(
                'relative flex flex-col items-start gap-2 p-3 rounded-lg border-2 text-left transition-all cursor-pointer',
                active
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/30',
              )}
            >
              {active && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              {/* Color preview */}
              <div className="flex gap-1">
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: preset.preview_colors.accent }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: preset.preview_colors.bg }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: preset.preview_colors.text }}
                />
              </div>
              <div>
                <span className="text-sm font-medium block">{preset.name}</span>
                <span className="text-xs text-muted-foreground">
                  {preset.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
