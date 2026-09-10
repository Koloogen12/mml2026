// blog.css exposes the brand CSS variables + Tailwind utility classes used
// by the BlogTeaser section that the landing embeds before <Contacts />.
// Keeping the import here (not in the root layout) scopes Tailwind loading
// to /ru/** only, so /en and / stay untouched.
import './blog/blog.css';
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
  // Widget script is intentionally NOT loaded here — it's specific to the
  // landing homepage and was leaking into /ru/blog/** pages where it took
  // over the layout. `/ru/page.tsx` loads the widget itself.
  return <>{children}</>;
}
