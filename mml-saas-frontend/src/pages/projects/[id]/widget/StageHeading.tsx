import type { FC } from 'react';
import type { WidgetConfig } from './types';

interface StageHeadingProps {
  config: WidgetConfig;
  title: string;
  subtitle?: string;
}

export const StageHeading: FC<StageHeadingProps> = ({
  config,
  title,
  subtitle,
}) => (
  <>
    <p
      className="text-center font-semibold mb-1 text-sm leading-[18px]"
      style={{ color: config.text_color }}
    >
      {title}
    </p>
    {subtitle && (
      <p
        className="text-center mb-4 text-[10px] leading-[14px]"
        style={{ color: config.secondary_text_color }}
      >
        {subtitle}
      </p>
    )}
  </>
);
