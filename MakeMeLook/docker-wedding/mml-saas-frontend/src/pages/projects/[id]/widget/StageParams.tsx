import type { FC } from 'react';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { PrimaryBtn } from './PrimaryBtn';
import { StageHeading } from './StageHeading';
import { PreviewSlider } from './PreviewSlider';

const FemaleIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path
      d="M10.8 16C10.8 15.5582 10.4418 15.2 10 15.2C9.55817 15.2 9.2 15.5582 9.2 16H10.8ZM9.2 21C9.2 21.4418 9.55817 21.8 10 21.8C10.4418 21.8 10.8 21.4418 10.8 21H9.2ZM14.8 16C14.8 15.5582 14.4418 15.2 14 15.2C13.5582 15.2 13.2 15.5582 13.2 16H14.8ZM13.2 21C13.2 21.4418 13.5582 21.8 14 21.8C14.4418 21.8 14.8 21.4418 14.8 21H13.2ZM8 16L7.23078 15.7802C7.16182 16.0216 7.21015 16.2813 7.36132 16.4818C7.51249 16.6822 7.74897 16.8 8 16.8V16ZM16 16V16.8C16.251 16.8 16.4875 16.6822 16.6387 16.4818C16.7898 16.2813 16.8382 16.0216 16.7692 15.7802L16 16ZM4.50038 10.3752C4.15531 10.6511 4.09926 11.1545 4.3752 11.4996C4.65113 11.8447 5.15455 11.9007 5.49962 11.6248L4.50038 10.3752ZM18.5004 11.6248C18.8455 11.9007 19.3489 11.8447 19.6248 11.4996C19.9007 11.1545 19.8447 10.6511 19.4996 10.3752L18.5004 11.6248ZM12 6V6.8V6ZM12 2V1.2V2ZM9.2 16V21H10.8V16H9.2ZM13.2 16V21H14.8V16H13.2ZM8 16.8H16V15.2H8V16.8ZM16.7692 15.7802L14.7692 8.78022L13.2308 9.21978L15.2308 16.2198L16.7692 15.7802ZM14 8.2H10V9.8H14V8.2ZM9.23078 8.78022L7.23078 15.7802L8.76922 16.2198L10.7692 9.21978L9.23078 8.78022ZM5.49962 11.6248C7.06539 10.3728 8.56053 9.8 10 9.8V8.2C8.10547 8.2 6.26861 8.96125 4.50038 10.3752L5.49962 11.6248ZM19.4996 10.3752C17.7314 8.96125 15.8945 8.2 14 8.2V9.8C15.4395 9.8 16.9346 10.3728 18.5004 11.6248L19.4996 10.3752ZM9.2 4C9.2 4.74261 9.495 5.4548 10.0201 5.9799L11.1515 4.84853C10.9264 4.62348 10.8 4.31826 10.8 4H9.2ZM10.0201 5.9799C10.5452 6.505 11.2574 6.8 12 6.8V5.2C11.6817 5.2 11.3765 5.07357 11.1515 4.84853L10.0201 5.9799ZM12 6.8C12.7426 6.8 13.4548 6.505 13.9799 5.9799L12.8485 4.84853C12.6235 5.07357 12.3183 5.2 12 5.2V6.8ZM13.9799 5.9799C14.505 5.4548 14.8 4.74261 14.8 4H13.2C13.2 4.31826 13.0736 4.62348 12.8485 4.84853L13.9799 5.9799ZM14.8 4C14.8 3.25739 14.505 2.5452 13.9799 2.0201L12.8485 3.15147C13.0736 3.37652 13.2 3.68174 13.2 4H14.8ZM13.9799 2.0201C13.4548 1.495 12.7426 1.2 12 1.2V2.8C12.3183 2.8 12.6235 2.92643 12.8485 3.15147L13.9799 2.0201ZM12 1.2C11.2574 1.2 10.5452 1.495 10.0201 2.0201L11.1515 3.15147C11.3765 2.92643 11.6817 2.8 12 2.8V1.2ZM10.0201 2.0201C9.495 2.5452 9.2 3.25739 9.2 4H10.8C10.8 3.68174 10.9264 3.37652 11.1515 3.15147L10.0201 2.0201Z"
      fill="currentColor"
    />
  </svg>
);

const MaleIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    width="25"
    height="24"
    viewBox="0 0 25 24"
    fill="none"
    className={className}
  >
    <path
      d="M9.7 21C9.7 21.4418 10.0582 21.8 10.5 21.8C10.9418 21.8 11.3 21.4418 11.3 21H9.7ZM13.7 21C13.7 21.4418 14.0582 21.8 14.5 21.8C14.9418 21.8 15.3 21.4418 15.3 21H13.7ZM4.93431 10.4343C4.6219 10.7467 4.6219 11.2533 4.93431 11.5657C5.24673 11.8781 5.75327 11.8781 6.06569 11.5657L4.93431 10.4343ZM18.9343 11.5657C19.2467 11.8781 19.7533 11.8781 20.0657 11.5657C20.3781 11.2533 20.3781 10.7467 20.0657 10.4343L18.9343 11.5657ZM12.5 6V6.8V6ZM12.5 2V1.2V2ZM9.7 16V21H11.3V16H9.7ZM13.7 16V21H15.3V16H13.7ZM9.5 9.8H15.5V8.2H9.5V9.8ZM14.708 8.88686L13.708 15.8869L15.292 16.1131L16.292 9.11314L14.708 8.88686ZM14.5 15.2H10.5V16.8H14.5V15.2ZM11.292 15.8869L10.292 8.88686L8.70804 9.11314L9.70804 16.1131L11.292 15.8869ZM6.06569 11.5657C7.31149 10.3199 8.45401 9.8 9.5 9.8V8.2C7.87999 8.2 6.35451 9.01412 4.93431 10.4343L6.06569 11.5657ZM20.0657 10.4343C18.6455 9.01412 17.12 8.2 15.5 8.2V9.8C16.546 9.8 17.6885 10.3199 18.9343 11.5657L20.0657 10.4343ZM9.7 4C9.7 4.74261 9.995 5.4548 10.5201 5.9799L11.6515 4.84853C11.4264 4.62348 11.3 4.31826 11.3 4H9.7ZM10.5201 5.9799C11.0452 6.505 11.7574 6.8 12.5 6.8V5.2C12.1817 5.2 11.8765 5.07357 11.6515 4.84853L10.5201 5.9799ZM12.5 6.8C13.2426 6.8 13.9548 6.505 14.4799 5.9799L13.3485 4.84853C13.1235 5.07357 12.8183 5.2 12.5 5.2V6.8ZM14.4799 5.9799C15.005 5.4548 15.3 4.74261 15.3 4H13.7C13.7 4.31826 13.5736 4.62348 13.3485 4.84853L14.4799 5.9799ZM15.3 4C15.3 3.25739 15.005 2.5452 14.4799 2.0201L13.3485 3.15147C13.5736 3.37652 13.7 3.68174 13.7 4H15.3ZM14.4799 2.0201C13.9548 1.495 13.2426 1.2 12.5 1.2V2.8C12.8183 2.8 13.1235 2.92643 13.3485 3.15147L14.4799 2.0201ZM12.5 1.2C11.7574 1.2 11.0452 1.495 10.5201 2.0201L11.6515 3.15147C11.8765 2.92643 12.1817 2.8 12.5 2.8V1.2ZM10.5201 2.0201C9.995 2.5452 9.7 3.25739 9.7 4H11.3C11.3 3.68174 11.4264 3.37652 11.6515 3.15147L10.5201 2.0201Z"
      fill="currentColor"
    />
  </svg>
);

export const StageParams: FC<StageProps> = ({ config, fontFamily }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-8">
      <StageHeading
        config={config}
        title={config.params_title}
        subtitle={config.params_subtitle}
      />
      {/* Gender zone-switcher */}
      <div
        className="flex mb-5 p-1 rounded-[29px]"
        style={{ backgroundColor: config.accent_color, height: 42 }}
      >
        <div
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full"
          style={{ backgroundColor: config.bg_color, color: config.text_color }}
        >
          <FemaleIcon className="w-5 h-5" />
          {t(locale, 'widgetConfig.female')}
        </div>
        <div
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full"
          style={{ color: config.secondary_text_color }}
        >
          <MaleIcon className="w-5 h-5" />
          {t(locale, 'widgetConfig.male')}
        </div>
      </div>
      <div className="space-y-4">
        <PreviewSlider
          label={t(locale, 'widgetConfig.height')}
          value="168"
          unit="cm"
          config={config}
          progress={0.55}
        />
        <PreviewSlider
          label={t(locale, 'widgetConfig.weight')}
          value="60"
          unit="kg"
          config={config}
          progress={0.35}
        />
      </div>
      <div className="mt-auto pb-4 flex gap-2">
        <button
          className="flex-[32] flex items-center justify-center h-8 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor:
              config.color_mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9e9e9',
            color: config.secondary_text_color,
            fontFamily,
          }}
        >
          {t(locale, 'widgetConfig.back')}
        </button>
        <PrimaryBtn config={config} fontFamily={fontFamily} className="flex-[65]">
          {t(locale, 'widgetConfig.continue')}
        </PrimaryBtn>
      </div>
    </div>
  );
};
