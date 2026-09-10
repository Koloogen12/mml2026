import { useState } from 'react';
import type { FC } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

interface CopyButtonProps {
  text: string;
}

export const CopyButton: FC<CopyButtonProps> = ({ text }) => {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          {t(locale, 'common.copied')}
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-2" />
          {t(locale, 'common.copy')}
        </>
      )}
    </Button>
  );
};
