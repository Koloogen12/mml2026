import type { FC } from 'react';
import { LegalPage } from './_legal-page';
import policyRu from '@/content/legal/personal-data-policy.ru.md?raw';
import { useLocale } from '@/shared/lib/locale';

const EN_DISCLAIMER =
  'This is the Personal Data Processing Policy required by Russian Federal Law No. 152-FZ, Article 18.1. The authoritative text is in Russian. ООО «МОНОРУС» is registered in the Roskomnadzor Operators Registry under No. 77-23-155314.';

export const Component: FC = () => {
  const locale = useLocale();
  const title =
    locale === 'ru' ? 'Политика обработки персональных данных' : 'Personal Data Processing Policy';

  return <LegalPage title={title} content={policyRu} englishDisclaimer={EN_DISCLAIMER} />;
};
