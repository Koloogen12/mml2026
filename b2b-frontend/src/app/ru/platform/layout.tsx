import { Metadata } from 'next';
import Script from 'next/script';
import { ReactNode } from 'react';

// eslint-disable-next-line import/no-unused-modules
export const metadata: Metadata = {
  title: 'MakeMeLook Platform — Виджет виртуальной примерки для интернет-магазинов',
  description:
    'Встраиваемый AI-виджет виртуальной примерки для интернет-магазинов. Увеличьте конверсию на 40%, снизьте возвраты на 25%. Подключение за 5 минут.',
  keywords: [
    'виртуальная примерка',
    'примерка одежды онлайн',
    'виджет для интернет-магазина',
    'AI примерка',
    'увеличение конверсии',
    'снижение возвратов'
  ],
  openGraph: {
    title: 'MakeMeLook Platform — Виджет виртуальной примерки',
    description:
      'Встраиваемый AI-виджет для интернет-магазинов. Увеличьте конверсию на 40%, снизьте возвраты на 25%.',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'MakeMeLook'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MakeMeLook Platform — Виджет виртуальной примерки',
    description: 'Встраиваемый AI-виджет для интернет-магазинов. Увеличьте конверсию на 40%.'
  },
  alternates: {
    canonical: 'https://www.makemelook.ai/ru/platform',
    languages: {
      'ru-RU': 'https://www.makemelook.ai/ru/platform',
      'en-US': 'https://www.makemelook.ai/en/platform'
    }
  }
};

// eslint-disable-next-line import/no-unused-modules
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}

      <Script
        strategy="afterInteractive"
        id="mml-widget"
        src="https://widget.makemelook.tech/loader.js"
        data-project="08fb8de7-5ec4-4304-b51f-7f5a9c14c6ac"
        data-api="https://admin.makemelook.tech"
        data-cdn="https://widget.makemelook.tech"
      />
    </>
  );
}
