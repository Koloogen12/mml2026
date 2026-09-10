import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiError } from '@/shared/api';
import type {
  EcommerceStoreResponse,
  UpdateEcommerceStoreRequest,
} from '@/shared/api/integrations';

interface EditIntegrationDialogProps {
  store: EcommerceStoreResponse;
  onSave: (storeId: number, data: UpdateEcommerceStoreRequest) => Promise<void>;
}

export const EditIntegrationDialog: FC<EditIntegrationDialogProps> = ({
  store,
  onSave,
}) => {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(store.name);
  const [apiUrl, setApiUrl] = useState(store.api_url);
  const [apiKey, setApiKey] = useState('');
  const [syncInterval, setSyncInterval] = useState(store.sync_interval);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(store.name);
      setApiUrl(store.api_url);
      setApiKey('');
      setSyncInterval(store.sync_interval);
      setError('');
    }
  }, [open, store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const updates: UpdateEcommerceStoreRequest = {};
    if (name.trim() !== store.name) updates.name = name.trim();
    if (apiUrl.trim() !== store.api_url) updates.api_url = apiUrl.trim();
    if (apiKey.trim()) updates.api_key = apiKey.trim();
    if (syncInterval !== store.sync_interval)
      updates.sync_interval = syncInterval;

    if (Object.keys(updates).length === 0) {
      setOpen(false);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(store.id, updates);
      setOpen(false);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="cursor-pointer">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(locale, 'integration.editIntegration')}</DialogTitle>
          <DialogDescription>
            {t(locale, 'integration.editDescription').replace('{name}', store.name)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">{t(locale, 'integration.storeName')}</Label>
              <Input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="editApiUrl">{t(locale, 'integration.apiUrl')}</Label>
              <Input
                id="editApiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="editApiKey">{t(locale, 'integration.apiKey')}</Label>
              <Input
                id="editApiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t(locale, 'integration.apiKeyPlaceholder')}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="editSyncInterval">{t(locale, 'integration.syncInterval')}</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">{t(locale, 'integration.every15m')}</SelectItem>
                  <SelectItem value="30m">{t(locale, 'integration.every30m')}</SelectItem>
                  <SelectItem value="1h">{t(locale, 'integration.every1h')}</SelectItem>
                  <SelectItem value="6h">{t(locale, 'integration.every6h')}</SelectItem>
                  <SelectItem value="12h">{t(locale, 'integration.every12h')}</SelectItem>
                  <SelectItem value="24h">{t(locale, 'integration.every24h')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {t(locale, 'common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t(locale, 'common.saving')}
                </>
              ) : (
                t(locale, 'common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
