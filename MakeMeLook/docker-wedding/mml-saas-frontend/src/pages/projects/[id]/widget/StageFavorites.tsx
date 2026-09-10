import type { FC } from 'react';
import { User, Heart } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { StageHeading } from './StageHeading';

export const StageFavorites: FC<StageProps> = ({ config }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-8">
      <StageHeading
        config={config}
        title={t(locale, 'widgetConfig.favoritesTitle')}
        subtitle={t(locale, 'widgetConfig.favoritesSubtitle')}
      />
      <div className="grid grid-cols-2 gap-2 flex-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden relative bg-[#e6e6e6]"
          >
            <div className="w-full h-full flex items-center justify-center min-h-[60px]">
              <User className="w-6 h-6 text-[#bbb]" />
            </div>
            <div
              className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: config.bg_color }}
            >
              <Heart className="w-2.5 h-2.5 text-[#e74c3c] fill-[#e74c3c]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
