import { useState } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import { SettingsGeneralTab } from './SettingsGeneralTab';
import { SettingsIdentityTab } from './SettingsIdentityTab';
import { SettingsDomainsTab } from './SettingsDomainsTab';
import { SettingsDangerTab } from './SettingsDangerTab';
import { SettingsIntegrationsTab } from './SettingsIntegrationsTab';

export const Component: FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="general">{t(locale, 'settings.general')}</TabsTrigger>
        <TabsTrigger value="identity">{t(locale, 'settings.identity')}</TabsTrigger>
        <TabsTrigger value="domains">{t(locale, 'settings.domains')}</TabsTrigger>
        <TabsTrigger value="integrations">{t(locale, 'settings.integrations')}</TabsTrigger>
        <TabsTrigger value="danger">{t(locale, 'settings.dangerZone')}</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <SettingsGeneralTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="identity">
        <SettingsIdentityTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="domains">
        <SettingsDomainsTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="integrations">
        <SettingsIntegrationsTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="danger">
        <SettingsDangerTab projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
};
