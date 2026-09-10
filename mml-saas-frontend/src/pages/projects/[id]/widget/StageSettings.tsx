import type { FC } from 'react';
import { ChevronRight } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { StageHeading } from './StageHeading';

const SETTINGS_ITEMS: TranslationKey[] = [
  'widgetConfig.editBodyParams',
  'widgetConfig.changePhoto',
  'widgetConfig.myAccount',
  'widgetConfig.myFavorites',
  'widgetConfig.myTryonHistory',
  'widgetConfig.myPurchases',
];

export const StageSettings: FC<StageProps> = ({ config }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-8">
      <StageHeading config={config} title={t(locale, 'widgetConfig.settingsTitle')} />
      <div className="space-y-1">
        {SETTINGS_ITEMS.map((itemKey) => (
          <div
            key={itemKey}
            className="flex items-center justify-between py-2.5 border-b"
            style={{ borderColor: config.secondary_text_color + '15' }}
          >
            <span className="text-[11px]" style={{ color: config.text_color }}>
              {t(locale, itemKey)}
            </span>
            <ChevronRight
              className="w-3.5 h-3.5"
              style={{ color: config.secondary_text_color }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
