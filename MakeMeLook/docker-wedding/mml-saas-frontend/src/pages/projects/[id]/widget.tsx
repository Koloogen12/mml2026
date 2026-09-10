import { useState, useCallback, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import {
  MousePointer2,
  PanelTop,
  Layers,
  ToggleRight,
  Users,
  Cog,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useWidgetConfig,
  useUpdateWidgetConfig,
  useApplyPreset,
} from '@/shared/api';
import type { WidgetConfigResponse } from '@/shared/api';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import { WidgetButtonTab } from './widget/WidgetButtonTab';
import { WidgetWindowTab } from './widget/WidgetWindowTab';
import { WidgetStagesTab } from './widget/WidgetStagesTab';
import { WidgetElementsTab } from './widget/WidgetElementsTab';
import { WidgetAvatarsTab } from './widget/WidgetAvatarsTab';
import { WidgetBehaviorTab } from './widget/WidgetBehaviorTab';
import { WidgetPreview } from './widget/WidgetPreview';
import { WidgetPresets } from './widget/WidgetPresets';
import { ConfirmDialog } from '@/shared/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { WidgetConfig } from './widget/types';

type TabId =
  | 'button'
  | 'window'
  | 'stages'
  | 'elements'
  | 'avatars'
  | 'behavior';

interface TabItem {
  id: TabId;
  labelKey: 'widgetConfig.tabButton' | 'widgetConfig.tabWindow' | 'widgetConfig.tabStages' | 'widgetConfig.tabElements' | 'widgetConfig.tabAvatars' | 'widgetConfig.tabBehavior';
  icon: FC<{ className?: string }>;
  tooltipKey: 'widgetConfig.tooltipButton' | 'widgetConfig.tooltipWindow' | 'widgetConfig.tooltipStages' | 'widgetConfig.tooltipElements' | 'widgetConfig.tooltipAvatars' | 'widgetConfig.tooltipBehavior';
}

const TABS: TabItem[] = [
  { id: 'button', labelKey: 'widgetConfig.tabButton', icon: MousePointer2, tooltipKey: 'widgetConfig.tooltipButton' },
  { id: 'window', labelKey: 'widgetConfig.tabWindow', icon: PanelTop, tooltipKey: 'widgetConfig.tooltipWindow' },
  { id: 'stages', labelKey: 'widgetConfig.tabStages', icon: Layers, tooltipKey: 'widgetConfig.tooltipStages' },
  { id: 'elements', labelKey: 'widgetConfig.tabElements', icon: ToggleRight, tooltipKey: 'widgetConfig.tooltipElements' },
  { id: 'avatars', labelKey: 'widgetConfig.tabAvatars', icon: Users, tooltipKey: 'widgetConfig.tooltipAvatars' },
  { id: 'behavior', labelKey: 'widgetConfig.tabBehavior', icon: Cog, tooltipKey: 'widgetConfig.tooltipBehavior' },
];

const AUTO_SAVE_DELAY = 1000;

function extractConfigFields(response: WidgetConfigResponse): WidgetConfig {
  const copy = { ...response } as Partial<WidgetConfigResponse>;
  delete copy.id;
  delete copy.project_id;
  delete copy.created_at;
  delete copy.updated_at;
  return copy as WidgetConfig;
}

// Loader component — fetches config then renders the editor
export const Component: FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: serverConfig, isLoading } = useWidgetConfig(projectId);

  if (isLoading || !serverConfig) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)] min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <WidgetConfigurator
      key={serverConfig.id}
      projectId={projectId}
      initialConfig={extractConfigFields(serverConfig)}
    />
  );
};

// Editor component — manages local state with debounced auto-save
interface WidgetConfiguratorProps {
  projectId: number;
  initialConfig: WidgetConfig;
}

const WidgetConfigurator: FC<WidgetConfiguratorProps> = ({
  projectId,
  initialConfig,
}) => {
  const locale = useLocale();
  const updateMutation = useUpdateWidgetConfig(projectId);
  const applyPresetMutation = useApplyPreset(projectId);

  const [activeTab, setActiveTab] = useState<TabId>('button');
  const [config, setConfig] = useState<WidgetConfig>(initialConfig);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const saveConfig = useCallback(
    (newConfig: WidgetConfig) => {
      setSaveStatus('saving');
      updateMutation.mutate(newConfig, {
        onSuccess: () => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        },
        onError: () => {
          setSaveStatus('idle');
          toast.error(t(locale, 'widgetConfig.saveFailed'));
        },
      });
    },
    [updateMutation, locale],
  );

  const handleChange = useCallback(
    (updates: Partial<WidgetConfig>) => {
      setConfig((prev) => {
        const next = { ...prev, ...updates };

        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          saveConfig(next);
        }, AUTO_SAVE_DELAY);

        return next;
      });
    },
    [saveConfig],
  );

  const handleApplyPreset = useCallback(
    (presetId: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      setSaveStatus('saving');
      applyPresetMutation.mutate(presetId, {
        onSuccess: (data) => {
          setConfig((prev) => ({
            ...prev,
            ...extractConfigFields(data),
          }));
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        },
        onError: () => {
          setSaveStatus('idle');
          toast.error(t(locale, 'widgetConfig.presetFailed'));
        },
      });
    },
    [applyPresetMutation, locale],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'button':
        return <WidgetButtonTab config={config} onChange={handleChange} />;
      case 'window':
        return (
          <WidgetWindowTab
            projectId={projectId}
            config={config}
            onChange={handleChange}
          />
        );
      case 'stages':
        return <WidgetStagesTab config={config} onChange={handleChange} />;
      case 'elements':
        return <WidgetElementsTab config={config} onChange={handleChange} />;
      case 'avatars':
        return <WidgetAvatarsTab config={config} onChange={handleChange} />;
      case 'behavior':
        return <WidgetBehaviorTab config={config} onChange={handleChange} />;
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
      {/* Left Panel — Settings */}
      <div className="w-[380px] shrink-0 flex flex-col border rounded-xl bg-card overflow-hidden">
        {/* Tab Navigation + Save Status */}
        <div className="grid grid-cols-6 border-b relative">
          <TooltipProvider delayDuration={300}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors cursor-pointer border-b-2 -mb-px',
                      activeTab === tab.id
                        ? 'border-primary text-primary font-medium'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {t(locale, tab.labelKey)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  {t(locale, tab.tooltipKey)}
                </TooltipContent>
              </Tooltip>
            );
          })}
          </TooltipProvider>
          {/* Save status indicator */}
          <div className="absolute -top-0.5 right-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t(locale, 'widgetConfig.saving')}
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3 h-3 text-green-500" />
                {t(locale, 'widgetConfig.saved')}
              </>
            )}
            {saveStatus === 'idle' && (
              <span className="text-muted-foreground/50">{t(locale, 'widgetConfig.autoSave')}</span>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">{renderTabContent()}</div>

        {/* Presets at bottom */}
        <div className="border-t p-4 space-y-3">
          <WidgetPresets currentConfig={config} onApply={handleApplyPreset} />
          <ConfirmDialog
            title={t(locale, 'widgetConfig.resetConfirmTitle')}
            description={t(locale, 'widgetConfig.resetConfirmDesc')}
            confirmText={t(locale, 'widgetConfig.resetConfirm')}
            destructive
            onConfirm={async () => {
              handleApplyPreset('minimalist');
              toast.success(t(locale, 'widgetConfig.resetSuccess'));
            }}
          >
            <button
              type="button"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer w-full justify-center py-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t(locale, 'widgetConfig.resetDefaults')}
            </button>
          </ConfirmDialog>
        </div>
      </div>

      {/* Right Panel — Preview */}
      <div className="flex-1 min-w-0">
        <WidgetPreview config={config} />
      </div>
    </div>
  );
};
