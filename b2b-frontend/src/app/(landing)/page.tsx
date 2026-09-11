import type { Metadata } from 'next';

import Landing from './Landing';
import faqJsonLd from './jsonld.generated.json';

// eslint-disable-next-line import/no-unused-modules
export const metadata: Metadata = {
  title: 'MakeMeLook — виртуальная примерка для интернет-магазина одежды',
  description:
    'Одно фото — и покупатель видит вашу вещь на себе. Размер считается по вашей размерной сетке. Виджет ставится скриптом на Tilda, InSales, 1С-Битрикс, CS-Cart, OpenCart и самописные сайты.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: '/',
    siteName: 'MakeMeLook',
    title: 'MakeMeLook — виртуальная примерка для интернет-магазина одежды',
    description:
      'Одно фото — и покупатель видит вашу вещь на себе. Размер считается по вашей размерной сетке.',
    // ЗАГЛУШКА: OG-картинка от текущего /ru, своей для v2 пока нет
    images: '/assets/images/og-ru.jpeg'
  }
};

// eslint-disable-next-line import/no-unused-modules
export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD FAQPage — один в один из <helmet> макета
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Landing />
    </>
  );
}
