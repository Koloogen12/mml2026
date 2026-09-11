// Под /ru остался только /ru/platform: старый лендинг виджета (/ru) и журнал
// (/ru/blog) отсюда уехали — лендинг занял корень, журнал живёт на /blog,
// оба старых адреса отдают 301 (см. redirects() в next.config.mjs).
//
// blog.css здесь остаётся, хотя журнала под /ru больше нет. Он приезжал сюда
// ради BlogTeaser старого лендинга, но заодно давал /ru/platform Tailwind
// preflight — и страница на него опирается: без него line-height падает с 1.5
// на UA-шный normal, тексты карточек сжимаются, страница становится на 150 px
// короче (проверено скриншотами). Убирать preflight — отдельная задача про
// /ru/platform и /en/platform (близнец без Tailwind, он уже рисуется иначе),
// а не побочный эффект переезда лендинга.
import '../blog/blog.css';
import type { Metadata } from 'next';

// eslint-disable-next-line import/no-unused-modules
export const metadata: Metadata = {
  title: 'MakeMeLook - виджет виртуальной примерочной на ваш сайт',
  metadataBase: new URL(process.env.BASE_URL ?? ''),
  openGraph: {
    images: '/assets/images/og-ru.jpeg'
  },
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-16x16.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-32x32.png'
    },
    {
      rel: 'apple-touch-icon',
      type: 'image/png',
      sizes: '180x180',
      url: '/apple-touch-icon.png'
    },
    {
      rel: 'android-chrome',
      type: 'image/png',
      sizes: '192x192',
      url: '/android-chrome-192x192.png'
    },
    {
      rel: 'favicon',
      url: '/favicon.ico'
    }
  ]
};

// eslint-disable-next-line import/no-unused-modules
export default function RuPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
