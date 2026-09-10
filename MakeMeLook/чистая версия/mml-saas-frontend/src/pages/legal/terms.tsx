import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLocale } from '@/shared/lib/locale';

const TERMS_RU = `
Настоящее Пользовательское соглашение регулирует использование платформы MakeMeLook.

1. Предмет соглашения
Платформа MakeMeLook предоставляет SaaS-сервис виртуальной примерки одежды с использованием технологий искусственного интеллекта.

2. Условия использования
Пользователь обязуется использовать сервис добросовестно, не нарушая права третьих лиц и применимое законодательство.

3. Интеллектуальная собственность
Все права на платформу, включая код, дизайн и алгоритмы, принадлежат MakeMeLook.

4. Ограничение ответственности
Сервис предоставляется «как есть». MakeMeLook не гарантирует бесперебойную работу и не несёт ответственности за косвенные убытки.

5. Изменение условий
MakeMeLook оставляет за собой право изменять условия соглашения с уведомлением пользователей.
`.trim();

const TERMS_EN = `
This Terms of Service agreement governs the use of the MakeMeLook platform.

1. Subject
MakeMeLook provides a SaaS virtual try-on service powered by artificial intelligence.

2. Usage
Users agree to use the service in good faith, without violating third-party rights or applicable laws.

3. Intellectual Property
All rights to the platform, including code, design, and algorithms, belong to MakeMeLook.

4. Limitation of Liability
The service is provided "as is." MakeMeLook does not guarantee uninterrupted operation and is not liable for indirect damages.

5. Changes
MakeMeLook reserves the right to modify these terms with prior notice to users.
`.trim();

export const Component: FC = () => {
  const locale = useLocale();
  const navigate = useNavigate();
  const text = locale === 'ru' ? TERMS_RU : TERMS_EN;
  const title = locale === 'ru' ? 'Пользовательское соглашение' : 'Terms of Service';

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
