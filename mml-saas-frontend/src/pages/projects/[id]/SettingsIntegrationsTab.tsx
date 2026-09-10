import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import {
  RefreshCw,
  Trash2,
  Loader2,
  ShoppingCart,
  Plug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { formatDate } from '@/shared/lib/formatDate';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/shared/ui';
import { AddIntegrationDialog } from '@/shared/ui/add-integration-dialog';
import { EditIntegrationDialog } from '@/shared/ui/edit-integration-dialog';
import { CategoryMappingDialog } from '@/shared/ui/category-mapping-dialog';
import { toast } from 'sonner';
import {
  integrationsApi,
  type EcommerceStoreResponse,
  type CreateEcommerceStoreRequest,
  type UpdateEcommerceStoreRequest,
} from '@/shared/api/integrations';

interface Props {
  projectId: number;
}

export const SettingsIntegrationsTab: FC<Props> = ({ projectId }) => {
  const [stores, setStores] = useState<EcommerceStoreResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());
  const [testingIds, setTestingIds] = useState<Set<number>>(new Set());
  const locale = useLocale();

  const fetchStores = useCallback(async () => {
    try {
      const data = await integrationsApi.list(projectId);
      setStores(data.stores);
    } catch {
      toast.error(t(locale, 'settingsIntegrations.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [projectId, locale]);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  const handleAdd = async (data: CreateEcommerceStoreRequest) => {
    await integrationsApi.create(projectId, data);
    await fetchStores();
    toast.success(t(locale, 'settingsIntegrations.connected'));
  };

  const handleDelete = async (storeId: number) => {
    await integrationsApi.delete(projectId, storeId);
    await fetchStores();
    toast.success(t(locale, 'settingsIntegrations.deleted'));
  };

  const handleUpdate = async (
    storeId: number,
    data: UpdateEcommerceStoreRequest,
  ) => {
    await integrationsApi.update(projectId, storeId, data);
    await fetchStores();
    toast.success(t(locale, 'settingsIntegrations.updated'));
  };

  const handleToggleActive = async (store: EcommerceStoreResponse) => {
    await integrationsApi.update(projectId, store.id, {
      is_active: !store.is_active,
    });
    await fetchStores();
  };

  const handleTest = async (storeId: number) => {
    setTestingIds((prev) => new Set(prev).add(storeId));
    try {
      const result = await integrationsApi.test(projectId, storeId);
      if (result.success) {
        toast.success(`${t(locale, 'settingsIntegrations.connectionOk')} ${result.products_count} ${t(locale, 'settingsIntegrations.productsFound')}`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(t(locale, 'settingsIntegrations.testFailed'));
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev);
        next.delete(storeId);
        return next;
      });
    }
  };

  const handleSync = async (storeId: number) => {
    setSyncingIds((prev) => new Set(prev).add(storeId));
    try {
      await integrationsApi.sync(projectId, storeId);
      toast.success(t(locale, 'settingsIntegrations.syncStarted'));
      pollSyncStatus(storeId);
    } catch {
      toast.error(t(locale, 'settingsIntegrations.syncFailed'));
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(storeId);
        return next;
      });
    }
  };

  const pollSyncStatus = (storeId: number) => {
    const interval = setInterval(async () => {
      try {
        const status = await integrationsApi.getSyncStatus(projectId, storeId);
        if (status.status === 'completed' || status.status === 'idle') {
          clearInterval(interval);
          setSyncingIds((prev) => {
            const next = new Set(prev);
            next.delete(storeId);
            return next;
          });
          await fetchStores();
          toast.success(
            `${t(locale, 'settingsIntegrations.syncCompleted')} ${status.created} ${t(locale, 'settingsIntegrations.syncCreated')}, ${status.updated} ${t(locale, 'settingsIntegrations.syncUpdated')}`,
          );
        }
      } catch {
        clearInterval(interval);
        setSyncingIds((prev) => {
          const next = new Set(prev);
          next.delete(storeId);
          return next;
        });
      }
    }, 2000);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(locale, 'settingsIntegrations.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t(locale, 'settingsIntegrations.description')}
          </p>
        </div>

        {stores.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, 'settingsIntegrations.headerStore')}</TableHead>
                <TableHead>{t(locale, 'settingsIntegrations.headerPlatform')}</TableHead>
                <TableHead>{t(locale, 'settingsIntegrations.headerProducts')}</TableHead>
                <TableHead>{t(locale, 'settingsIntegrations.headerLastSync')}</TableHead>
                <TableHead>{t(locale, 'settingsIntegrations.headerActive')}</TableHead>
                <TableHead className="text-right">{t(locale, 'settingsIntegrations.headerActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{store.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {store.api_url}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{store.platform}</Badge>
                  </TableCell>
                  <TableCell>{store.products_count}</TableCell>
                  <TableCell className="text-sm">
                    {store.last_synced_at ? formatDate(store.last_synced_at, locale) : '—'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={store.is_active}
                      onCheckedChange={() => void handleToggleActive(store)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <CategoryMappingDialog
                        projectId={projectId}
                        storeId={store.id}
                        storeName={store.name}
                      />
                      <EditIntegrationDialog
                        store={store}
                        onSave={handleUpdate}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleTest(store.id)}
                        disabled={testingIds.has(store.id)}
                        className="cursor-pointer"
                      >
                        {testingIds.has(store.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plug className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleSync(store.id)}
                        disabled={syncingIds.has(store.id)}
                        className="cursor-pointer"
                      >
                        {syncingIds.has(store.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <ConfirmDialog
                        title={t(locale, 'settingsIntegrations.deleteTitle')}
                        description={`${t(locale, 'settingsIntegrations.deleteDesc')} ${store.name}${t(locale, 'settingsIntegrations.deleteDescEnd')}`}
                        confirmText={t(locale, 'settingsIntegrations.deleteBtn')}
                        destructive
                        onConfirm={() => handleDelete(store.id)}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {stores.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>{t(locale, 'settingsIntegrations.noIntegrations')}</p>
          </div>
        )}

        <AddIntegrationDialog onAdd={handleAdd} />
      </div>
    </Card>
  );
};
