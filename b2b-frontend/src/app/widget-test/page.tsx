'use client';

import Script from 'next/script';

import s from './page.module.css';

// eslint-disable-next-line import/no-unused-modules
export default function WidgetTest() {
  return (
    <main className={s.main}>
      <div className={s.container}>
        <h1 className={s.title}>Widget Testing</h1>

        <p className={s.subtitle}>MakeMeLook Virtual Try-On Widget</p>

        <div className={s.widgetWrapper}>
          {/* MakeMeLook Virtual Try-On Widget */}
          <Script
            id="mml-widget-test-loader"
            src="https://widget.makemelook.tech/loader.js"
            data-project="94707699-19e1-4b39-beda-7bbfa6bef09f"
            strategy="afterInteractive"
          />
        </div>
      </div>
    </main>
  );
}
