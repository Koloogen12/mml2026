import Script from 'next/script';

// eslint-disable-next-line import/no-unused-modules
export default function EnPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script strategy="lazyOnload" id="mmlb2b" src="/widget.js?v2" />

      {children}
    </>
  );
}
