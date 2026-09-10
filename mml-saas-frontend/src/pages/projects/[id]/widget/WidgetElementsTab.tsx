import type { FC } from 'react';
import { Switch } from '@/components/ui/switch';
import { Heart, ShoppingCart, History, Settings, Shirt } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig, ElementsEnabled, ClothTypesEnabled } from './types';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

interface ToggleItem {
  key: string;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: FC<{ className?: string }>;
  locked?: boolean;
}

const ELEMENTS: ToggleItem[] = [
  {
    key: 'favorites',
    labelKey: 'widgetConfig.favorites',
    descriptionKey: 'widgetConfig.favoritesDesc',
    icon: Heart,
  },
  {
    key: 'cart',
    labelKey: 'widgetConfig.cart',
    descriptionKey: 'widgetConfig.cartDesc',
    icon: ShoppingCart,
  },
  {
    key: 'history',
    labelKey: 'widgetConfig.tryonHistory',
    descriptionKey: 'widgetConfig.tryonHistoryDesc',
    icon: History,
  },
  {
    key: 'settings',
    labelKey: 'widgetConfig.settingsMenu',
    descriptionKey: 'widgetConfig.settingsMenuDesc',
    icon: Settings,
  },
];

const CLOTH_TYPES: ToggleItem[] = [
  {
    key: 'outerwear',
    labelKey: 'widgetConfig.outerwear',
    descriptionKey: 'widgetConfig.outerwearDesc',
    icon: Shirt,
  },
  {
    key: 'tops',
    labelKey: 'widgetConfig.tops',
    descriptionKey: 'widgetConfig.topsDesc',
    icon: Shirt,
    locked: true,
  },
  {
    key: 'bottoms',
    labelKey: 'widgetConfig.bottoms',
    descriptionKey: 'widgetConfig.bottomsDesc',
    icon: Shirt,
  },
  {
    key: 'shoes',
    labelKey: 'widgetConfig.shoes',
    descriptionKey: 'widgetConfig.shoesDesc',
    icon: Shirt,
  },
];

export const WidgetElementsTab: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  const handleElementToggle = (
    key: keyof ElementsEnabled,
    checked: boolean,
  ) => {
    onChange({
      elements_enabled: {
        ...config.elements_enabled,
        [key]: checked,
      },
    });
  };

  const handleClothToggle = (
    key: keyof ClothTypesEnabled,
    checked: boolean,
  ) => {
    onChange({
      cloth_types_enabled: {
        ...config.cloth_types_enabled,
        [key]: checked,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Widget Elements */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.widgetFeatures')}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t(locale, 'widgetConfig.widgetFeaturesHint')}
        </p>
      </div>

      <div className="space-y-2">
        {ELEMENTS.map((el) => {
          const Icon = el.icon;
          return (
            <div
              key={el.key}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium">{t(locale, el.labelKey)}</span>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, el.descriptionKey)}
                  </p>
                </div>
              </div>
              <Switch
                checked={
                  config.elements_enabled[el.key as keyof ElementsEnabled]
                }
                onCheckedChange={(checked) =>
                  handleElementToggle(el.key as keyof ElementsEnabled, checked)
                }
              />
            </div>
          );
        })}
      </div>

      <div className="border-t" />

      {/* Clothing Categories */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.clothingCategories')}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t(locale, 'widgetConfig.clothingCategoriesHint')}
        </p>
      </div>

      <div className="space-y-2">
        {CLOTH_TYPES.map((ct) => {
          const Icon = ct.icon;
          return (
            <div
              key={ct.key}
              className={`
                flex items-center justify-between p-3 rounded-lg border
                ${ct.locked ? 'bg-muted/30' : 'bg-card hover:bg-accent/5 transition-colors'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <span
                    className={`text-sm font-medium ${ct.locked ? 'text-muted-foreground' : ''}`}
                  >
                    {t(locale, ct.labelKey)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, ct.descriptionKey)}
                  </p>
                </div>
              </div>
              {ct.locked ? (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {t(locale, 'widgetConfig.required')}
                </span>
              ) : (
                <Switch
                  checked={
                    config.cloth_types_enabled[
                      ct.key as keyof ClothTypesEnabled
                    ]
                  }
                  onCheckedChange={(checked) =>
                    handleClothToggle(
                      ct.key as keyof ClothTypesEnabled,
                      checked,
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
