import type { FC } from 'react';
import type { WidgetConfig } from './types';

interface PreviewSliderProps {
  label: string;
  value: string;
  unit: string;
  config: WidgetConfig;
  progress: number;
}

export const PreviewSlider: FC<PreviewSliderProps> = ({
  label,
  value,
  unit,
  config,
  progress,
}) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span
        className="text-[10px] font-semibold"
        style={{ color: config.text_color }}
      >
        {label}
      </span>
      <span
        className="text-xs font-semibold"
        style={{ color: config.text_color }}
      >
        {value}{' '}
        <span
          className="text-[9px]"
          style={{ color: config.secondary_text_color }}
        >
          {unit}
        </span>
      </span>
    </div>
    <div className="relative h-0.5 rounded-full bg-[#f2f2f2]">
      <div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{
          width: `${progress * 100}%`,
          backgroundColor: config.accent_color,
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border border-[#f2f2f2] bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.12)]"
        style={{ left: `${progress * 100}%` }}
      />
    </div>
    <div className="flex justify-between mt-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-[7px] text-[#e9e9e9]">
          |
        </span>
      ))}
    </div>
  </div>
);
