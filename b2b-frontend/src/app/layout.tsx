import './globals.scss';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

import { presetsButton } from '@/fsd/shared/ui/Button/Button';

presetsButton.primarySolid = { className: 'uix-x-button-primary-solid' };
presetsButton.secondarySolid = { className: 'uix-x-button-secondary-solid' };
presetsButton.thirdlySolid = { className: 'uix-x-button-thirdly-solid' };

presetsButton.primarySolidDisabled = {
  className: 'uix-x-button-primary-solid uix--disabled'
};
presetsButton.secondarySolidDisabled = {
  className: 'uix-x-button-secondary-solid uix--disabled'
};
presetsButton.thirdlySolidDisabled = {
  className: 'uix-x-button-thirdly-solid uix--disabled'
};

const secondaryFont = Inter({
  variable: '--secondaryFont',
  weight: ['400', '500', '600', '700'],
  display: 'block',
  subsets: ['latin']
});

const primaryFont = Inter({
  variable: '--primaryFont',
  weight: ['400', '500', '600', '700'],
  display: 'block',
  subsets: ['latin']
});

// eslint-disable-next-line import/no-unused-modules
export const metadata: Metadata = {
  title: 'MakeMeLook - virtual fitting room widget for your website',
  metadataBase: new URL(process.env.BASE_URL ?? ''),
  openGraph: {
    images: '/assets/images/og-en.png'
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

const scriptsHtml = `
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(97809376, "init", {
      defer: true,
      clickmap:true,
      trackLinks:true,
      accurateTrackBounce:true,
      webvisor:true
   });
`;
const mcNoscript = `<div><img src="https://mc.yandex.ru/watch/97809376" style="position:absolute; left:-9999px;" alt="" /></div>`;

// eslint-disable-next-line import/no-unused-modules
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*<Script*/}
      {/*  strategy="lazyOnload"*/}
      {/*  id="mmlb2b"*/}
      {/*  src="https://b2b.makemelook.ai/widget_old/widget.js?v2"*/}
      {/*/>*/}

      <Script id="ya" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: scriptsHtml }} />

      <body className={`${secondaryFont.variable} ${primaryFont.variable} app-wrapper`}>
        <noscript dangerouslySetInnerHTML={{ __html: mcNoscript }} />

        {children}
      </body>
    </html>
  );
}
