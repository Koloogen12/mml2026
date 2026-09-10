'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import IconLogo from '@/fsd/shared/icons/IconLogo';

// Custom header for /ru/blog pages.
//
// We do not reuse the main landing <Header /> widget directly because that
// component accepts a single onClick handler for a demo-request modal that
// lives in the landing page state. On blog pages we instead route the CTA
// to the landing's #contact anchor.
//
// The visual structure mirrors src/fsd/widgets/Header/Header.tsx: logo on
// the left, center nav links, pill CTA on the right. Implemented with the
// blog's Tailwind utilities so the whole blog stays in one styling world.

export const BlogHeader = () => {
  const pathname = usePathname();
  const router = useRouter();

  const isBlogActive = pathname?.startsWith('/ru/blog');

  return (
    <header className="w-full">
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mx-auto flex max-w-container-brand items-center justify-between gap-6 px-4 py-[22px] md:px-2"
      >
        <Link href="/ru" className="flex-shrink-0 text-brand-dark" aria-label="MakeMeLook">
          <IconLogo />
        </Link>

        <nav
          aria-label="Основная навигация"
          className="hidden flex-1 items-center justify-center gap-7 sm:flex"
        >
          {/* /shopping/ is a separate docker stack served by edge nginx —
              plain <a> so Next.js doesn't try to client-navigate. */}
          <a
            href="/shopping/"
            rel="noopener"
            className="text-[15px] font-medium text-brand-ink transition-opacity duration-150 hover:opacity-65"
          >
            Демо-магазин
          </a>
          <Link
            href="/ru/blog"
            className={`text-[15px] font-medium transition-opacity duration-150 hover:opacity-65 ${
              isBlogActive ? 'text-brand-accent' : 'text-brand-ink'
            }`}
          >
            Блог
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => router.push('/ru#contact')}
          className="hidden h-[42px] flex-shrink-0 items-center justify-center rounded-[100px] bg-brand-cta px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-brand-cta-hover sm:inline-flex"
        >
          Получить демо
        </button>
      </motion.div>
    </header>
  );
};
