import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  X,
  Shirt,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig } from './types';
import { StageIntro } from './StageIntro';
import { StageParams } from './StageParams';
import { StageMeasurements } from './StageMeasurements';
import { StageBelly } from './StageBelly';
import { StageFigure } from './StageFigure';
import { StagePrivacy } from './StagePrivacy';
import { StagePhoto } from './StagePhoto';
import { StageShowroom } from './StageShowroom';
import { StageTryonResult } from './StageTryonResult';
import { StageFavorites } from './StageFavorites';
import { StageSettings } from './StageSettings';

interface Props {
  config: WidgetConfig;
  siteUrl?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<DeviceType, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

const DEVICE_ICONS: Record<DeviceType, FC<{ className?: string }>> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

const DEVICE_LABEL_KEYS: Record<DeviceType, TranslationKey> = {
  desktop: 'widgetConfig.deviceDesktop',
  tablet: 'widgetConfig.deviceTablet',
  mobile: 'widgetConfig.deviceMobile',
};

// Scaled-down modal dimensions for preview (real: 542x658)
const MODAL_SCALE = 0.62;
const MODAL_W = Math.round(542 * MODAL_SCALE);
const MODAL_H = Math.round(658 * MODAL_SCALE);

const BUTTON_BORDER_RADIUS: Record<string, string> = {
  circle: '50%',
  rectangle: '12px',
  pill: '999px',
};

type StageId =
  | 'intro'
  | 'params'
  | 'measurements'
  | 'belly'
  | 'figure'
  | 'privacy'
  | 'photo'
  | 'showroom'
  | 'tryon_result'
  | 'favorites'
  | 'settings';

interface StageInfo {
  id: StageId;
  labelKey: TranslationKey;
  alwaysAvailable?: boolean;
}

const ALL_STAGES: StageInfo[] = [
  { id: 'intro', labelKey: 'widgetConfig.previewIntro' },
  { id: 'params', labelKey: 'widgetConfig.previewParams' },
  { id: 'measurements', labelKey: 'widgetConfig.previewSizes' },
  { id: 'belly', labelKey: 'widgetConfig.previewBelly' },
  { id: 'figure', labelKey: 'widgetConfig.previewFigure' },
  { id: 'privacy', labelKey: 'widgetConfig.previewPrivacy', alwaysAvailable: true },
  { id: 'photo', labelKey: 'widgetConfig.previewPhoto', alwaysAvailable: true },
  { id: 'showroom', labelKey: 'widgetConfig.previewShowroom', alwaysAvailable: true },
  { id: 'tryon_result', labelKey: 'widgetConfig.previewTryon', alwaysAvailable: true },
  { id: 'favorites', labelKey: 'widgetConfig.previewFavorites' },
  { id: 'settings', labelKey: 'widgetConfig.previewSettings' },
];

export const WidgetPreview: FC<Props> = ({ config }) => {
  const locale = useLocale();
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  const fontFamily =
    config.font_family === 'System Default'
      ? 'Inter, sans-serif'
      : `${config.font_family}, Inter, sans-serif`;

  const availableStages = useMemo(() => {
    return ALL_STAGES.filter((s) => {
      if (s.alwaysAvailable) return true;
      switch (s.id) {
        case 'intro':
          return config.stages_enabled.intro;
        case 'params':
          return config.stages_enabled.height_weight;
        case 'measurements':
          return config.stages_enabled.measurements;
        case 'belly':
          return config.stages_enabled.belly;
        case 'figure':
          return config.stages_enabled.figure;
        case 'favorites':
          return config.elements_enabled.favorites;
        case 'settings':
          return config.elements_enabled.settings;
        default:
          return true;
      }
    });
  }, [config.stages_enabled, config.elements_enabled]);

  const safeIdx = Math.min(currentStageIdx, availableStages.length - 1);
  const currentStage = availableStages[safeIdx];
  const stagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = stagesScrollRef.current;
    if (!container) return;
    const activeBtn = container.children[safeIdx] as HTMLElement | undefined;
    if (!activeBtn) return;
    const left = activeBtn.offsetLeft - container.offsetLeft;
    const right = left + activeBtn.offsetWidth;
    if (left < container.scrollLeft) {
      container.scrollLeft = left;
    } else if (right > container.scrollLeft + container.clientWidth) {
      container.scrollLeft = right - container.clientWidth;
    }
  }, [safeIdx]);

  const goNext = () =>
    setCurrentStageIdx((i) => Math.min(i + 1, availableStages.length - 1));
  const goPrev = () => setCurrentStageIdx((i) => Math.max(i - 1, 0));

  const buttonPositionStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = { position: 'absolute' };
    if (config.button_position.includes('bottom'))
      style.bottom = config.button_offset_y * 0.6;
    if (config.button_position.includes('top'))
      style.top = config.button_offset_y * 0.6;
    if (config.button_position.includes('right'))
      style.right = config.button_offset_x * 0.6;
    if (config.button_position.includes('left'))
      style.left = config.button_offset_x * 0.6;
    return style;
  };

  const scaledButtonSize = Math.round(config.button_size * 0.75);

  const renderStage = () => {
    const props = { config, fontFamily };
    switch (currentStage?.id) {
      case 'intro':
        return <StageIntro {...props} />;
      case 'params':
        return <StageParams {...props} />;
      case 'measurements':
        return <StageMeasurements {...props} />;
      case 'belly':
        return <StageBelly {...props} />;
      case 'figure':
        return <StageFigure {...props} />;
      case 'privacy':
        return <StagePrivacy {...props} />;
      case 'photo':
        return <StagePhoto {...props} />;
      case 'showroom':
        return <StageShowroom {...props} />;
      case 'tryon_result':
        return <StageTryonResult {...props} />;
      case 'favorites':
        return <StageFavorites {...props} />;
      case 'settings':
        return <StageSettings {...props} />;
      default:
        return <StageIntro {...props} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview Area */}
      <div className="flex-1 bg-muted/30 rounded-xl border overflow-hidden relative flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-lg relative overflow-hidden transition-all duration-300 border max-w-full h-full min-h-[480px]"
          style={{
            width: device === 'desktop' ? '100%' : DEVICE_WIDTHS[device] * 0.65,
          }}
        >
          {/* Fake e-commerce site */}
          <div className="p-4 h-full flex flex-col font-[Inter,sans-serif]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-200" />
                <div className="w-20 h-2.5 rounded bg-gray-200" />
              </div>
              <div className="flex gap-3">
                <div className="w-12 h-2 rounded bg-gray-100" />
                <div className="w-12 h-2 rounded bg-gray-100" />
                <div className="w-12 h-2 rounded bg-gray-100" />
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-3 opacity-30">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-gray-50 flex flex-col overflow-hidden"
                >
                  <div className="flex-1 bg-gray-100 min-h-[60px]" />
                  <div className="p-2 space-y-1.5">
                    <div className="w-3/4 h-2 rounded bg-gray-200" />
                    <div className="w-1/3 h-2 rounded bg-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget Float Button */}
          <button
            type="button"
            onClick={() => setWidgetOpen(!widgetOpen)}
            className="flex items-center justify-center transition-all cursor-pointer z-50"
            style={{
              ...buttonPositionStyle(),
              width: config.button_type === 'pill' ? 'auto' : scaledButtonSize,
              height: scaledButtonSize,
              minWidth:
                config.button_type === 'pill'
                  ? scaledButtonSize * 1.8
                  : undefined,
              paddingLeft: config.button_type === 'pill' ? 14 : undefined,
              paddingRight: config.button_type === 'pill' ? 14 : undefined,
              backgroundColor: config.button_bg_color,
              borderRadius: BUTTON_BORDER_RADIUS[config.button_type],
              boxShadow: config.button_shadow
                ? '0 6px 30px rgba(0, 0, 0, 0.25)'
                : 'none',
              animation:
                config.button_animation === 'pulse' && !widgetOpen
                  ? 'mml-pulse 2s infinite'
                  : undefined,
            }}
            title={config.button_tooltip}
          >
            <Shirt
              className="w-5 h-5"
              style={{ color: config.button_icon_color }}
            />
            {config.button_type === 'pill' && (
              <span
                className="ml-1.5 text-xs font-medium whitespace-nowrap"
                style={{ color: config.button_icon_color }}
              >
                {config.button_tooltip}
              </span>
            )}
          </button>

          {/* Widget Modal */}
          {widgetOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center transition-opacity bg-black/50">
              <div
                className="relative flex flex-col overflow-hidden shadow-2xl"
                style={{
                  width: device === 'mobile' ? 'calc(100% - 12px)' : MODAL_W,
                  height: MODAL_H,
                  backgroundColor: config.bg_color,
                  borderRadius: config.border_radius,
                  fontFamily,
                }}
              >
                {/* Logo overlay (top-left) */}
                {config.logo_url && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    className="absolute top-3 left-3 h-4 w-auto object-contain z-10"
                  />
                )}

                {/* Close button overlay (top-right) */}
                <button
                  type="button"
                  onClick={() => setWidgetOpen(false)}
                  className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center cursor-pointer z-10 opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: config.secondary_text_color }}
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Stage content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {renderStage()}
                </div>

                {/* Powered by */}
                {config.show_powered_by && (
                  <div className="flex items-center justify-center gap-1 py-2 text-[9px]">
                    <span style={{ color: config.secondary_text_color }}>
                      {t(locale, 'widgetConfig.poweredBy')}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: config.text_color }}
                    >
                      MakeMeLook
                    </span>
                  </div>
                )}
              </div>

              {/* Stage navigation bar */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur rounded-lg p-1 shadow-lg">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={safeIdx === 0}
                  className="w-5 h-5 flex items-center justify-center rounded cursor-pointer disabled:opacity-20 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                </button>

                <div
                  ref={stagesScrollRef}
                  className="flex gap-0.5 overflow-x-auto max-w-[280px] mml-no-scrollbar"
                >
                  {availableStages.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCurrentStageIdx(idx)}
                      className={cn(
                        'px-2 py-1 text-[9px] font-medium rounded cursor-pointer transition-colors whitespace-nowrap',
                        safeIdx === idx
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
                      )}
                    >
                      {t(locale, s.labelKey)}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={safeIdx === availableStages.length - 1}
                  className="w-5 h-5 flex items-center justify-center rounded cursor-pointer disabled:opacity-20 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device Switcher */}
      <div className="flex items-center justify-center gap-1 mt-4">
        {(['desktop', 'tablet', 'mobile'] as const).map((d) => {
          const Icon = DEVICE_ICONS[d];
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
                device === d
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="capitalize">{t(locale, DEVICE_LABEL_KEYS[d])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
