import { useState } from 'react';
import type { FC } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText: string;
  /** When true, renders a destructive red button */
  destructive?: boolean;
  /** When set, user must type this value to enable the confirm button */
  requiresTyping?: boolean;
  requiredValue?: string;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  title,
  description,
  confirmText,
  destructive = false,
  requiresTyping,
  requiredValue,
  onConfirm,
  children,
}) => {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canConfirm = requiresTyping ? inputValue === requiredValue : true;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    try {
      setIsLoading(true);
      await onConfirm();
      setOpen(false);
      setInputValue('');
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setInputValue('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requiresTyping && requiredValue && (
          <div className="py-4">
            <Label htmlFor="confirm-input">
              {t(locale, 'confirm.typeToConfirm').split('{value}')[0]}<strong>{requiredValue}</strong>{t(locale, 'confirm.typeToConfirm').split('{value}')[1]}
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requiredValue}
              className="mt-2"
              disabled={isLoading}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t(locale, 'common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {confirmText}...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
