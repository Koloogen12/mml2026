import { Metadata } from 'next';
import Script from 'next/script';
import { ReactNode } from 'react';

// eslint-disable-next-line import/no-unused-modules
export const metadata: Metadata = {
  title: 'MakeMeLook Platform — Virtual Try-On Widget for Online Stores',
  description:
    'Embeddable AI-powered virtual try-on widget for online fashion retailers. Increase conversion by 40%, reduce returns by 25%. Connect in 5 minutes.',
  keywords: [
    'virtual try-on',
    'virtual fitting room',
    'fashion widget',
    'AI try-on',
    'ecommerce conversion',
    'reduce returns'
  ],
  openGraph: {
    title: 'MakeMeLook Platform — Virtual Try-On Widget',
    description:
      'Embeddable AI widget for online stores. Increase conversion by 40%, reduce returns by 25%.',
    type: 'website',
    locale: 'en_US',
    siteName: 'MakeMeLook'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MakeMeLook Platform — Virtual Try-On Widget',
    description: 'Embeddable AI widget for online stores. Increase conversion by 40%.'
  },
  alternates: {
    canonical: 'https://www.makemelook.ai/en/platform',
    languages: {
      'en-US': 'https://www.makemelook.ai/en/platform',
      'ru-RU': 'https://www.makemelook.ai/ru/platform'
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
