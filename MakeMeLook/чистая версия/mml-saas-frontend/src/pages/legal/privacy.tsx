import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLocale } from '@/shared/lib/locale';

const PRIVACY_RU = `
Политика обработки персональных данных MakeMeLook.

1. Оператор данных
Оператором персональных данных является MakeMeLook. Оператор определяет цели и способы обработки персональных данных пользователей сервиса.

2. Категории обрабатываемых данных
Оператор обрабатывает: идентификационные данные (email, имя); пользовательский контент (фотографии); данные профиля и предпочтений; технические данные; данные использования сервиса.

3. Цели обработки
Персональные данные обрабатываются для: исполнения пользовательского соглашения; предоставления функций AI-стилиста; персонализации рекомендаций; обеспечения безопасности платформы; аналитики и улучшения сервиса.

4. Хранение и защита
Данные хранятся на защищённых серверах. Фотографии обрабатываются AI-моделью и не передаются третьим лицам.

5. Права пользователя
Пользователь вправе запросить доступ к своим данным, их исправление или удаление через настройки аккаунта или по запросу в поддержку.
`.trim();

const PRIVACY_EN = `
MakeMeLook Personal Data Processing Policy.

1. Data Operator
MakeMeLook is the data operator. The operator determines the purposes and methods of processing user personal data.

2. Categories of Data
We process: identification data (email, name); user content (photos); profile data and preferences; technical data; service usage data.

3. Processing Purposes
Personal data is processed for: fulfilling the user agreement; providing AI stylist features; personalizing recommendations; ensuring platform security; analytics and service improvement.

4. Storage and Protection
Data is stored on secure servers. Photos are processed by AI models and are not shared with third parties.

5. User Rights
Users may request access to, correction of, or deletion of their data through account settings or by contacting support.
`.trim();

export const Component: FC = () => {
  const locale = useLocale();
  const navigate = useNavigate();
  const text = locale === 'ru' ? PRIVACY_RU : PRIVACY_EN;
  const title = locale === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 bg-transparent border-none cursor-pointer p-0"
        >
          <ArrowLeft className="size-4" />
          {locale === 'ru' ? 'Назад' : 'Back'}
        </button>
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        <div className="prose prose-sm dark:prose-invert whitespace-pre-line">
          {text}
        </div>
      </div>
    </div>
  );
};
