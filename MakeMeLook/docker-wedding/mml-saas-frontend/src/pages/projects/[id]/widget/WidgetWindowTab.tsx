import { useRef, type FC } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUploadWidgetLogo, useDeleteWidgetLogo } from '@/shared/api';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import { ColorPicker } from './ColorPicker';
import type { WidgetConfig, ColorMode } from './types';

interface Props {
  projectId: number;
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Playfair Display',
  'Lato',
  'Poppins',
  'Open Sans',
  'Raleway',
  'System Default',
];

export const WidgetWindowTab: FC<Props> = ({ projectId, config, onChange }) => {
  const locale = useLocale();
  const isCustomColors = config.color_mode === 'custom';
  const uploadLogoMutation = useUploadWidgetLogo(projectId);
  const deleteLogoMutation = useDeleteWidgetLogo(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t(locale, 'widgetConfig.logoSizeError'));
      return;
    }
    uploadLogoMutation.mutate(file, {
      onSuccess: (data) => {
        onChange({ logo_url: data.logo_url ?? undefined });
      },
      onError: () => {
        toast.error(t(locale, 'widgetConfig.logoUploadError'));
      },
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleColorModeChange = (mode: ColorMode) => {
    const updates: Partial<WidgetConfig> = { color_mode: mode };
    if (mode === 'light') {
      updates.bg_color = '#FFFFFF';
      updates.text_color = '#1A1A1A';
      updates.secondary_text_color = '#898989';
    } else if (mode === 'dark') {
      updates.bg_color = '#1A1A1A';
      updates.text_color = '#F5F5F5';
      updates.secondary_text_color = '#A0A0A0';
    }
    onChange(updates);
  };

  return (
    <div className="space-y-6">
      {/* Color Scheme */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.colorScheme')}
        </h4>

        <div>
          <Label className="text-sm">{t(locale, 'widgetConfig.mode')}</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {(['light', 'dark', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleColorModeChange(mode)}
                className={`
                  px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all capitalize
                  ${
                    config.color_mode === mode
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-muted hover:border-primary/50'
                  }
                `}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorPicker
            label={t(locale, 'widgetConfig.accent')}
            value={config.accent_color}
            onChange={(v) => onChange({ accent_color: v })}
          />
          <ColorPicker
            label={t(locale, 'widgetConfig.accentText')}
            value={config.accent_text_color}
            onChange={(v) => onChange({ accent_text_color: v })}
          />
        </div>

        <div
          className={
            isCustomColors
              ? 'space-y-4'
              : 'space-y-4 opacity-50 pointer-events-none'
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <ColorPicker
              label={t(locale, 'widgetConfig.background')}
              value={config.bg_color}
              onChange={(v) => onChange({ bg_color: v, color_mode: 'custom' })}
            />
            <ColorPicker
              label={t(locale, 'widgetConfig.text')}
              value={config.text_color}
              onChange={(v) =>
                onChange({ text_color: v, color_mode: 'custom' })
              }
            />
          </div>
          <ColorPicker
            label={t(locale, 'widgetConfig.secondaryText')}
            value={config.secondary_text_color}
            onChange={(v) =>
              onChange({ secondary_text_color: v, color_mode: 'custom' })
            }
          />
        </div>
      </div>

      <div className="border-t" />

      {/* Typography */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.typography')}
        </h4>

        <div>
          <Label className="text-sm">{t(locale, 'widgetConfig.fontFamily')}</Label>
          <Select
            value={config.font_family}
            onValueChange={(v) => onChange({ font_family: v })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font}>
                  <span
                    style={{
                      fontFamily: font === 'System Default' ? 'inherit' : font,
                    }}
                  >
                    {font}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">{t(locale, 'widgetConfig.borderRadius')}</Label>
            <span className="text-sm text-muted-foreground font-mono">
              {config.border_radius}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={24}
            value={config.border_radius}
            onChange={(e) =>
              onChange({ border_radius: Number(e.target.value) })
            }
            className="w-full accent-primary h-1.5 cursor-pointer"
          />
        </div>
      </div>

      <div className="border-t" />

      {/* Branding */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.branding')}
        </h4>

        <div className="space-y-3">
          <div>
            <Label className="text-sm">{t(locale, 'widgetConfig.logo')}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(locale, 'widgetConfig.logoHint')}
            </p>
          </div>

          {config.logo_url ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={config.logo_url}
                  alt={t(locale, 'widgetConfig.logoAlt')}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline"
              >
                {t(locale, 'widgetConfig.replace')}
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteLogoMutation.mutate(undefined, {
                    onSuccess: () => onChange({ logo_url: undefined }),
                    onError: () => toast.error(t(locale, 'widgetConfig.logoRemoveError')),
                  })
                }
                disabled={deleteLogoMutation.isPending}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                {deleteLogoMutation.isPending ? t(locale, 'widgetConfig.removing') : t(locale, 'widgetConfig.remove')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLogoMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploadLogoMutation.isPending ? t(locale, 'widgetConfig.uploading') : t(locale, 'widgetConfig.uploadLogo')}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">{t(locale, 'widgetConfig.showPoweredBy')}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(locale, 'widgetConfig.poweredByHint')}
            </p>
          </div>
          <Switch
            checked={config.show_powered_by}
            onCheckedChange={(v) => onChange({ show_powered_by: v })}
          />
        </div>
      </div>
    </div>
  );
};
