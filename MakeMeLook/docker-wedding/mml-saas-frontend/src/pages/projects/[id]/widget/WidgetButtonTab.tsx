import type { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import { ColorPicker } from './ColorPicker';
import type {
  WidgetConfig,
  ButtonPosition,
  ButtonType,
  ButtonAnimation,
} from './types';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

const SliderField: FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, unit = 'px', onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <Label className="text-sm">{label}</Label>
      <span className="text-sm text-muted-foreground font-mono">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary h-1.5 cursor-pointer"
    />
  </div>
);

export const WidgetButtonTab: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  return (
    <div className="space-y-6">
      {/* Position */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.position')}
        </h4>

        <div>
          <Label className="text-sm">{t(locale, 'widgetConfig.corner')}</Label>
          <Select
            value={config.button_position}
            onValueChange={(v: ButtonPosition) =>
              onChange({ button_position: v })
            }
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">{t(locale, 'widgetConfig.bottomRight')}</SelectItem>
              <SelectItem value="bottom-left">{t(locale, 'widgetConfig.bottomLeft')}</SelectItem>
              <SelectItem value="top-right">{t(locale, 'widgetConfig.topRight')}</SelectItem>
              <SelectItem value="top-left">{t(locale, 'widgetConfig.topLeft')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SliderField
          label={t(locale, 'widgetConfig.horizontalOffset')}
          value={config.button_offset_x}
          min={8}
          max={100}
          onChange={(v) => onChange({ button_offset_x: v })}
        />

        <SliderField
          label={t(locale, 'widgetConfig.verticalOffset')}
          value={config.button_offset_y}
          min={8}
          max={100}
          onChange={(v) => onChange({ button_offset_y: v })}
        />
      </div>

      <div className="border-t" />

      {/* Appearance */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.appearance')}
        </h4>

        <div>
          <Label className="text-sm">{t(locale, 'widgetConfig.shape')}</Label>
          <Select
            value={config.button_type}
            onValueChange={(v: ButtonType) => onChange({ button_type: v })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circle">{t(locale, 'widgetConfig.circle')}</SelectItem>
              <SelectItem value="rectangle">{t(locale, 'widgetConfig.rectangle')}</SelectItem>
              <SelectItem value="pill">{t(locale, 'widgetConfig.pill')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SliderField
          label={t(locale, 'widgetConfig.size')}
          value={config.button_size}
          min={40}
          max={80}
          onChange={(v) => onChange({ button_size: v })}
        />

        <div className="grid grid-cols-2 gap-4">
          <ColorPicker
            label={t(locale, 'widgetConfig.background')}
            value={config.button_bg_color}
            onChange={(v) => onChange({ button_bg_color: v })}
          />
          <ColorPicker
            label={t(locale, 'widgetConfig.iconColor')}
            value={config.button_icon_color}
            onChange={(v) => onChange({ button_icon_color: v })}
          />
        </div>

        <div>
          <Label htmlFor="button-tooltip" className="text-sm">
            {t(locale, 'widgetConfig.tooltipText')}
          </Label>
          <Input
            id="button-tooltip"
            value={config.button_tooltip}
            onChange={(e) => onChange({ button_tooltip: e.target.value })}
            className="mt-1.5"
            maxLength={50}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">{t(locale, 'widgetConfig.shadow')}</Label>
          <Switch
            checked={config.button_shadow}
            onCheckedChange={(v) => onChange({ button_shadow: v })}
          />
        </div>
      </div>

      <div className="border-t" />

      {/* Animation */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.animation')}
        </h4>

        <div>
          <Label className="text-sm">{t(locale, 'widgetConfig.effect')}</Label>
          <Select
            value={config.button_animation}
            onValueChange={(v: ButtonAnimation) =>
              onChange({ button_animation: v })
            }
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t(locale, 'widgetConfig.none')}</SelectItem>
              <SelectItem value="pulse">{t(locale, 'widgetConfig.pulse')}</SelectItem>
              <SelectItem value="wobble">{t(locale, 'widgetConfig.wobble')}</SelectItem>
              <SelectItem value="glow">{t(locale, 'widgetConfig.glow')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SliderField
          label={t(locale, 'widgetConfig.appearanceDelay')}
          value={config.button_delay}
          min={0}
          max={30}
          unit="s"
          onChange={(v) => onChange({ button_delay: v })}
        />
      </div>
    </div>
  );
};
