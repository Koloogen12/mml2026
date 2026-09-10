import type { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/shared/ui';
import { useProject } from '@/shared/api';
import { formatDateTime } from '@/shared/lib/formatDate';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

interface Props {
  projectId: number;
}

export const SettingsIdentityTab: FC<Props> = ({ projectId }) => {
  const { data: project } = useProject(projectId);
  const locale = useLocale();

  if (!project) return null;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(locale, 'settingsIdentity.heading')}</h3>
          <p className="text-sm text-muted-foreground">
            {t(locale, 'settingsIdentity.description')}
          </p>
        </div>

        <div>
          <Label>{t(locale, 'settingsIdentity.projectId')}</Label>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 bg-muted px-4 py-3 rounded-lg font-mono text-sm">
              {project.public_id}
            </code>
            <CopyButton text={project.public_id} />
          </div>
        </div>

        <div>
          <Label>{t(locale, 'settingsIdentity.createdAt')}</Label>
          <p className="mt-2 text-sm">{formatDateTime(project.created_at, locale)}</p>
        </div>

        <div>
          <Label>{t(locale, 'settingsIdentity.updatedAt')}</Label>
          <p className="mt-2 text-sm">{formatDateTime(project.updated_at, locale)}</p>
        </div>
      </div>
    </Card>
  );
};
