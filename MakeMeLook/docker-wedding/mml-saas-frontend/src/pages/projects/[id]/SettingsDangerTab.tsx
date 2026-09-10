import type { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/shared/ui';
import {
  projectsApi,
  getApiError,
  projectKeys,
  useProject,
} from '@/shared/api';
import { toast } from 'sonner';

interface Props {
  projectId: number;
}

export const SettingsDangerTab: FC<Props> = ({ projectId }) => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId);

  const handleTogglePause = async () => {
    if (!project) return;
    const newStatus = project.status === 'paused' ? 'active' : 'paused';
    try {
      await projectsApi.updateStatus(project.id, newStatus);
      await queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
      toast.success(
        newStatus === 'paused'
          ? t(locale, 'settingsDanger.projectPaused')
          : t(locale, 'settingsDanger.projectResumed'),
      );
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await projectsApi.delete(project.id);
      navigate(lp('/projects'));
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  if (!project) return null;

  return (
    <div className="space-y-4">
      <Card className="p-6 border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              {project.status === 'paused'
                ? t(locale, 'settingsDanger.resumeProject')
                : t(locale, 'settingsDanger.pauseProject')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {project.status === 'paused'
                ? t(locale, 'settingsDanger.resumeDesc')
                : t(locale, 'settingsDanger.pauseDesc')}
            </p>
          </div>
          <Button
            variant="outline"
            className="border-yellow-600 text-yellow-600 hover:bg-yellow-50 cursor-pointer"
            onClick={handleTogglePause}
          >
            {project.status === 'paused'
              ? t(locale, 'settingsDanger.resumeProject')
              : t(locale, 'settingsDanger.pauseProject')}
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-destructive">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t(locale, 'settingsDanger.deleteProject')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(locale, 'settingsDanger.deleteDesc')}
            </p>
          </div>
          <ConfirmDialog
            title={t(locale, 'settingsDanger.deleteConfirmTitle')}
            description={t(locale, 'settingsDanger.deleteConfirmDesc')}
            confirmText={t(locale, 'settingsDanger.deleteConfirmBtn')}
            destructive
            requiresTyping
            requiredValue={project.name}
            onConfirm={handleDeleteProject}
          >
            <Button variant="destructive" className="cursor-pointer">
              {t(locale, 'settingsDanger.deleteProject')}
            </Button>
          </ConfirmDialog>
        </div>
      </Card>
    </div>
  );
};
