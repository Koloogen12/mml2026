import type { FC } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, Ruler, Scale, User, Shapes, FileText } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { WidgetConfig, StagesEnabled } from './types';
import { StageIntroSettings } from './StageIntroSettings';
import { StageParamsSettings } from './StageParamsSettings';
import { StageMeasurementsSettings } from './StageMeasurementsSettings';
import { StageBellySettings } from './StageBellySettings';
import { StageFigureSettings } from './StageFigureSettings';

interface Props {
  config: WidgetConfig;
  onChange: (updates: Partial<WidgetConfig>) => void;
}

interface StageItem {
  key: keyof StagesEnabled;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: FC<{ className?: string }>;
  required?: boolean;
}

const STAGES: StageItem[] = [
  {
    key: 'intro',
    labelKey: 'widgetConfig.stageIntro',
    descriptionKey: 'widgetConfig.stageIntroDesc',
    icon: Sparkles,
  },
  {
    key: 'gender',
    labelKey: 'widgetConfig.stageGenderSelection',
    descriptionKey: 'widgetConfig.stageGenderSelectionDesc',
    icon: Users,
  },
  {
    key: 'height_weight',
    labelKey: 'widgetConfig.stageHeightWeight',
    descriptionKey: 'widgetConfig.stageHeightWeightDesc',
    icon: Ruler,
  },
  {
    key: 'measurements',
    labelKey: 'widgetConfig.stageBodyMeasurements',
    descriptionKey: 'widgetConfig.stageBodyMeasurementsDesc',
    icon: Scale,
  },
  {
    key: 'belly',
    labelKey: 'widgetConfig.stageBellyShape',
    descriptionKey: 'widgetConfig.stageBellyShapeDesc',
    icon: User,
  },
  {
    key: 'figure',
    labelKey: 'widgetConfig.stageBodyType',
    descriptionKey: 'widgetConfig.stageBodyTypeDesc',
    icon: Shapes,
  },
];

interface RequiredStageItem {
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}

const REQUIRED_STAGES: RequiredStageItem[] = [
  {
    labelKey: 'widgetConfig.stagePrivacyPolicy',
    descriptionKey: 'widgetConfig.stagePrivacyPolicyDesc',
  },
  {
    labelKey: 'widgetConfig.stagePhotoUpload',
    descriptionKey: 'widgetConfig.stagePhotoUploadDesc',
  },
  {
    labelKey: 'widgetConfig.stageShowroom',
    descriptionKey: 'widgetConfig.stageShowroomDesc',
  },
];

export const WidgetStagesTab: FC<Props> = ({ config, onChange }) => {
  const locale = useLocale();

  const handleToggle = (key: keyof StagesEnabled, checked: boolean) => {
    onChange({
      stages_enabled: {
        ...config.stages_enabled,
        [key]: checked,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.optionalStages')}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t(locale, 'widgetConfig.optionalStagesHint')}
        </p>
      </div>

      <div className="space-y-2">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{t(locale, stage.labelKey)}</span>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, stage.descriptionKey)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.stages_enabled[stage.key]}
                  onCheckedChange={(checked) =>
                    handleToggle(stage.key, checked)
                  }
                />
              </div>

              {stage.key === 'intro' && config.stages_enabled.intro && (
                <StageIntroSettings config={config} onChange={onChange} />
              )}
              {stage.key === 'height_weight' &&
                config.stages_enabled.height_weight && (
                  <StageParamsSettings config={config} onChange={onChange} />
                )}
              {stage.key === 'measurements' &&
                config.stages_enabled.measurements && (
                  <StageMeasurementsSettings
                    config={config}
                    onChange={onChange}
                  />
                )}
              {stage.key === 'belly' && config.stages_enabled.belly && (
                <StageBellySettings config={config} onChange={onChange} />
              )}
              {stage.key === 'figure' && config.stages_enabled.figure && (
                <StageFigureSettings config={config} onChange={onChange} />
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t" />

      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t(locale, 'widgetConfig.requiredStages')}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t(locale, 'widgetConfig.requiredStagesHint')}
        </p>
      </div>

      <div className="space-y-2">
        {REQUIRED_STAGES.map((stage) => (
          <div
            key={stage.labelKey}
            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  {t(locale, stage.labelKey)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t(locale, stage.descriptionKey)}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {t(locale, 'widgetConfig.required')}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
