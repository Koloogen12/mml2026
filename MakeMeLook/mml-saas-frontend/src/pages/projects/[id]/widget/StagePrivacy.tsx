import type { FC } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { PrimaryBtn } from './PrimaryBtn';
import { StageHeading } from './StageHeading';

export const StagePrivacy: FC<StageProps> = ({ config, fontFamily }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-8">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: config.accent_color + '15' }}
        >
          <ShieldCheck
            className="w-6 h-6"
            style={{ color: config.accent_color }}
          />
        </div>
        <StageHeading
          config={config}
          title={t(locale, 'widgetConfig.privacyTitle')}
          subtitle={t(locale, 'widgetConfig.privacySubtitle')}
        />
        <div
          className="flex items-start gap-2 rounded-lg p-3 mb-4 text-left"
          style={{ backgroundColor: config.secondary_text_color + '08' }}
        >
          <div
            className="w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center"
            style={{
              borderColor: config.accent_color,
              backgroundColor: config.accent_color,
            }}
          >
            <Check
              className="w-2.5 h-2.5"
              style={{ color: config.accent_text_color }}
            />
          </div>
          <span
            className="text-[9px] leading-[13px]"
            style={{ color: config.secondary_text_color }}
          >
            {t(locale, 'widgetConfig.privacyConsent')}
          </span>
        </div>
        <PrimaryBtn config={config} fontFamily={fontFamily}>
          {t(locale, 'widgetConfig.continue')}
        </PrimaryBtn>
      </div>
    </div>
  );
};
