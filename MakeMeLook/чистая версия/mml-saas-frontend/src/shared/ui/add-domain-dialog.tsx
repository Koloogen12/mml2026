import { useState } from 'react';
import type { FC } from 'react';
import { Plus, Loader2 } from 'lucide-react';
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
import { getApiError } from '@/shared/api';

interface AddDomainDialogProps {
  onAdd: (domain: string) => Promise<void>;
}

export const AddDomainDialog: FC<AddDomainDialogProps> = ({ onAdd }) => {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!domain.trim()) {
      setError(t(locale, 'domain.domainRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdd(domain.trim());
      setOpen(false);
      setDomain('');
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setDomain('');
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          {t(locale, 'domain.addDomain')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(locale, 'domain.addNewDomain')}</DialogTitle>
          <DialogDescription>
            {t(locale, 'domain.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">{t(locale, 'domain.domainLabel')}</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="mt-2"
                disabled={isSubmitting}
              />
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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
                  {t(locale, 'domain.adding')}
                </>
              ) : (
                t(locale, 'domain.addDomain')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
