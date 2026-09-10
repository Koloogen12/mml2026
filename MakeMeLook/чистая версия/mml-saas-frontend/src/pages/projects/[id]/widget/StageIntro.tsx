import type { FC } from 'react';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { PrimaryBtn } from './PrimaryBtn';

export const StageIntro: FC<StageProps> = ({ config, fontFamily }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col">
      <div
        className="flex-1 bg-no-repeat"
        style={{
          backgroundImage: `url(${config.intro_image})`,
          backgroundSize: '127% auto',
          backgroundPosition: '50% 0',
        }}
      />
      <div
        className="relative -mt-6 px-4 pt-4 pb-3 flex flex-col items-center rounded-t-[20px]"
        style={{ backgroundColor: config.bg_color }}
      >
        <p
          className="text-center font-semibold mb-1 text-[11px] leading-[15px]"
          style={{ color: config.text_color }}
        >
          {config.intro_title}
        </p>
        <p
          className="text-center mb-3 text-[8px] leading-[12px]"
          style={{ color: config.secondary_text_color }}
        >
          {config.intro_description}
        </p>
        <PrimaryBtn config={config} fontFamily={fontFamily}>
          {t(locale, 'widgetConfig.continue')}
        </PrimaryBtn>
      </div>
    </div>
  );
};
