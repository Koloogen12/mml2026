import type { FC } from 'react';
import { Switch } from '@/components/ui/switch';
import { Users, Upload, UserCircle, Layers } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig, PhotoModeDefault } from './types';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

const PHOTO_MODES: {
  value: PhotoModeDefault;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: FC<{ className?: string }>;
}[] = [
  {
    value: 'upload',
    labelKey: 'widgetConfig.uploadOnly',
    descriptionKey: 'widgetConfig.uploadOnlyDesc',
    icon: Upload,
  },
  {
    value: 'avatar',
    labelKey: 'widgetConfig.avatarsOnly',
    descriptionKey: 'widgetConfig.avatarsOnlyDesc',
    icon: UserCircle,
  },
  {
    value: 'both',
    labelKey: 'widgetConfig.bothOptions',
    descriptionKey: 'widgetConfig.bothOptionsDesc',
    icon: Layers,
  },
];

export const WidgetAvatarsTab: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.avatarCollection')}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t(locale, 'widgetConfig.avatarCollectionDesc')}
        </p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-sm font-medium">{t(locale, 'widgetConfig.enableAvatars')}</span>
            <p className="text-xs text-muted-foreground">
              {t(locale, 'widgetConfig.enableAvatarsDesc')}
            </p>
          </div>
        </div>
        <Switch
          checked={config.avatars_enabled}
          onCheckedChange={(v) => onChange({ avatars_enabled: v })}
        />
      </div>

      {config.avatars_enabled && (
        <>
          <div className="border-t" />

          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {t(locale, 'widgetConfig.defaultPhotoMode')}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t(locale, 'widgetConfig.defaultPhotoModeDesc')}
            </p>
          </div>

          <div className="space-y-2">
            {PHOTO_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = config.photo_mode_default === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => onChange({ photo_mode_default: mode.value })}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all
                    ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/30 bg-card'
                    }
                  `}
                >
                  <div
                    className={`
                    w-8 h-8 rounded-md flex items-center justify-center
                    ${isSelected ? 'bg-primary/10' : 'bg-muted'}
                  `}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                  </div>
                  <div>
                    <span
                      className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}
                    >
                      {t(locale, mode.labelKey)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, mode.descriptionKey)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              {t(locale, 'widgetConfig.avatarNote')}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
