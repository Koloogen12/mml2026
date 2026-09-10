import type { FC } from 'react';
import { LegalPage } from './_legal-page';
import termsRu from '@/content/legal/terms-of-use.ru.md?raw';
import { useLocale } from '@/shared/lib/locale';

const EN_DISCLAIMER =
  'The authoritative text of the Terms of Use is in Russian, as the Service is operated by a Russian legal entity (ООО «МОНОРУС») and subject to Russian law. The Russian version below is legally binding.';

export const Component: FC = () => {
  const locale = useLocale();
  const title = locale === 'ru' ? 'Пользовательское соглашение' : 'Terms of Use';

  return <LegalPage title={title} content={termsRu} englishDisclaimer={EN_DISCLAIMER} />;
};
