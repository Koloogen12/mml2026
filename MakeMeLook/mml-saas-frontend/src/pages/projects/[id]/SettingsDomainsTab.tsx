import type { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog, AddDomainDialog } from '@/shared/ui';
import { domainsApi, projectKeys, useProject, useProjectDomains } from '@/shared/api';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';

interface Props {
  projectId: number;
}

export const SettingsDomainsTab: FC<Props> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const { data: project } = useProject(projectId);
  const { data: domainsData } = useProjectDomains(projectId);
  const domains = domainsData ?? [];

  const handleAddDomain = async (domain: string) => {
    if (!project) return;
    await domainsApi.add(project.id, domain);
    await queryClient.invalidateQueries({ queryKey: projectKeys.domains(projectId) });
  };

  const handleDeleteDomain = async (domainId: number) => {
    if (!project) return;
    await domainsApi.delete(project.id, domainId);
    await queryClient.invalidateQueries({ queryKey: projectKeys.domains(projectId) });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(locale, 'settingsDomains.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t(locale, 'settingsDomains.description')}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t(locale, 'settingsDomains.headerDomain')}</TableHead>
              <TableHead>{t(locale, 'settingsDomains.headerStatus')}</TableHead>
              <TableHead className="text-right">{t(locale, 'settingsDomains.headerActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.map((domain) => (
              <TableRow key={domain.id}>
                <TableCell className="font-mono text-sm">{domain.domain}</TableCell>
                <TableCell>
                  {domain.domain === 'localhost' ? (
                    <Badge variant="secondary">{t(locale, 'settingsDomains.dev')}</Badge>
                  ) : domain.is_verified ? (
                    <Badge className="bg-green-500/10 text-green-700">{t(locale, 'settingsDomains.verified')}</Badge>
                  ) : (
                    <Badge variant="outline">{t(locale, 'settingsDomains.unverified')}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {domain.domain !== 'localhost' && (
                    <ConfirmDialog
                      title={t(locale, 'settingsDomains.removeTitle')}
                      description={`${t(locale, 'settingsDomains.removeDesc')} ${domain.domain}${t(locale, 'settingsDomains.removeDescEnd')}`}
                      confirmText={t(locale, 'settingsDomains.removeBtn')}
                      destructive
                      onConfirm={() => handleDeleteDomain(domain.id)}
                    >
                      <Button variant="ghost" size="sm" className="cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </ConfirmDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <AddDomainDialog onAdd={handleAddDomain} />
      </div>
    </Card>
  );
};
