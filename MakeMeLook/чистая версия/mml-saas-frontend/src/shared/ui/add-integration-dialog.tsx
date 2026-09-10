import { useState } from 'react';
import type { FC } from 'react';
import { Loader2, Plus } from 'lucide-react';
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
import type { CreateEcommerceStoreRequest } from '@/shared/api/integrations';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

interface AddIntegrationDialogProps {
  onAdd: (data: CreateEcommerceStoreRequest) => Promise<void>;
}

export const AddIntegrationDialog: FC<AddIntegrationDialogProps> = ({
  onAdd,
}) => {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState('cs-cart');
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiEmail, setApiEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [syncInterval, setSyncInterval] = useState('1h');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t(locale, 'addIntegration.errorName'));
      return;
    }
    if (!apiUrl.trim()) {
      setError(t(locale, 'addIntegration.errorUrl'));
      return;
    }
    if (!apiKey.trim()) {
      setError(t(locale, 'addIntegration.errorKey'));
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdd({
        platform,
        name: name.trim(),
        api_url: apiUrl.trim(),
        api_email: apiEmail.trim() || undefined,
        api_key: apiKey.trim(),
        sync_interval: syncInterval,
      });
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPlatform('cs-cart');
    setName('');
    setApiUrl('');
    setApiEmail('');
    setApiKey('');
    setSyncInterval('1h');
    setError('');
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          {t(locale, 'addIntegration.btn')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(locale, 'addIntegration.title')}</DialogTitle>
          <DialogDescription>
            {t(locale, 'addIntegration.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platform">{t(locale, 'addIntegration.platform')}</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs-cart">CS-Cart</SelectItem>
                  <SelectItem value="opencart">OpenCart</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">{t(locale, 'addIntegration.storeName')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(locale, 'addIntegration.storeNamePlaceholder')}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="apiUrl">{t(locale, 'addIntegration.apiUrl')}</Label>
              <Input
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={
                  platform === 'cs-cart'
                    ? 'https://shop.example.com'
                    : 'https://shop.example.com/index.php?route=api/product'
                }
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            {platform === 'cs-cart' && (
              <div>
                <Label htmlFor="apiEmail">{t(locale, 'addIntegration.adminEmail')}</Label>
                <Input
                  id="apiEmail"
                  type="email"
                  value={apiEmail}
                  onChange={(e) => setApiEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="mt-2"
                  disabled={isSubmitting}
                />
              </div>
            )}
            <div>
              <Label htmlFor="apiKey">{t(locale, 'addIntegration.apiKey')}</Label>
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t(locale, 'addIntegration.apiKeyPlaceholder')}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="syncInterval">{t(locale, 'addIntegration.syncInterval')}</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">{t(locale, 'addIntegration.every15m')}</SelectItem>
                  <SelectItem value="30m">{t(locale, 'addIntegration.every30m')}</SelectItem>
                  <SelectItem value="1h">{t(locale, 'addIntegration.every1h')}</SelectItem>
                  <SelectItem value="6h">{t(locale, 'addIntegration.every6h')}</SelectItem>
                  <SelectItem value="12h">{t(locale, 'addIntegration.every12h')}</SelectItem>
                  <SelectItem value="24h">{t(locale, 'addIntegration.every24h')}</SelectItem>
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
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t(locale, 'addIntegration.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t(locale, 'addIntegration.connecting')}
                </>
              ) : (
                t(locale, 'addIntegration.connect')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
