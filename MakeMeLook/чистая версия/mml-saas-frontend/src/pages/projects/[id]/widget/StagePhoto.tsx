import type { FC } from 'react';
import { Camera, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { SecondaryBtn } from './SecondaryBtn';
import { StageHeading } from './StageHeading';

export const StagePhoto: FC<StageProps> = ({ config, fontFamily }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-8">
      <StageHeading
        config={config}
        title={t(locale, 'widgetConfig.uploadYourPhoto')}
        subtitle={t(locale, 'widgetConfig.photoSubtitle')}
      />
      {/* Photo examples */}
      <div className="flex gap-2 mb-3 justify-center">
        {[true, true, false, false].map((good, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-11 h-16 rounded-md mb-1 flex items-center justify-center"
              style={{
                backgroundColor: config.secondary_text_color + '10',
                border: `1px solid ${good ? '#4fc0a5' : '#e74c3c'}40`,
              }}
            >
              <User
                className="w-4 h-4"
                style={{ color: config.secondary_text_color + '40' }}
              />
            </div>
            <span
              className={cn(
                'text-[7px]',
                good ? 'text-[#4fc0a5]' : 'text-[#e74c3c]',
              )}
            >
              {good ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
      {/* Upload area */}
      <div
        className="flex-1 rounded-lg flex flex-col items-center justify-center border-2 border-dashed mb-3"
        style={{ borderColor: config.secondary_text_color + '30' }}
      >
        <Camera
          className="w-8 h-8 mb-2"
          style={{ color: config.secondary_text_color + '40' }}
        />
        <span
          className="text-[10px]"
          style={{ color: config.secondary_text_color }}
        >
          {t(locale, 'widgetConfig.tapToUpload')}
        </span>
      </div>
      {config.avatars_enabled && (
        <div className="mb-3 flex justify-center">
          <SecondaryBtn config={config} fontFamily={fontFamily}>
            {t(locale, 'widgetConfig.chooseAvatar')}
          </SecondaryBtn>
        </div>
      )}
    </div>
  );
};
