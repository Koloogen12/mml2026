import type { FC } from 'react';
import { LegalPage } from './_legal-page';
import privacyRu from '@/content/legal/privacy-policy.ru.md?raw';
import { useLocale } from '@/shared/lib/locale';

const EN_DISCLAIMER =
  'The authoritative text of the Privacy Policy is in Russian. The Service is operated by ООО «МОНОРУС» under Russian Federal Law No. 152-FZ on Personal Data. The Russian version below is legally binding.';

export const Component: FC = () => {
  const locale = useLocale();
  const title = locale === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy';

  return <LegalPage title={title} content={privacyRu} englishDisclaimer={EN_DISCLAIMER} />;
};
