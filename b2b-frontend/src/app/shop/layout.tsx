'use client';

import './shop.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Script from 'next/script';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {/* MakeMeLook Virtual Try-On Widget */}
      <Script
        id="mml-widget-loader"
        src="https://makemelook.ai/widget/loader.js"
        data-project="7ad27409-5573-4312-89ec-a4823324feaa"
        data-api="https://makemelook.ai"
        data-cdn="https://makemelook.ai/widget"
        strategy="lazyOnload"
      />
      <div className="shop-root">
        {children}
      </div>
    </QueryClientProvider>
  );
}
