import type { FC } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig } from './types';
import { INTRO_IMAGES } from './introImages';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

export const StageIntroSettings: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  return (
    <div className="ml-11 mt-2 mb-1 space-y-3 p-3 rounded-lg border border-dashed bg-muted/20">
      <div className="space-y-1.5">
        <Label htmlFor="intro-title" className="text-xs">
          {t(locale, 'widgetConfig.title')}
        </Label>
        <Input
          id="intro-title"
          value={config.intro_title}
          onChange={(e) => onChange({ intro_title: e.target.value })}
          className="text-sm h-8"
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="intro-desc" className="text-xs">
          {t(locale, 'widgetConfig.description')}
        </Label>
        <Textarea
          id="intro-desc"
          value={config.intro_description}
          onChange={(e) => onChange({ intro_description: e.target.value })}
          className="text-sm min-h-[60px] resize-none"
          maxLength={250}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t(locale, 'widgetConfig.backgroundImage')}</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {INTRO_IMAGES.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onChange({ intro_image: img.src })}
              className={cn(
                'relative aspect-[3/2] rounded-md overflow-hidden border-2 cursor-pointer transition-all',
                config.intro_image === img.src
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-transparent hover:border-primary/30',
              )}
            >
              <img
                src={img.src}
                alt={img.label}
                className="w-full h-full object-cover"
              />
              {config.intro_image === img.src && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
