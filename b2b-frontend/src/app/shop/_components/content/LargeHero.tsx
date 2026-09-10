'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const LargeHero = () => {
  return (
    <section className="w-full mb-16 mt-4">
      <div className="px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <Link href="/shop/category/new-season" className="group block">
            <div className="aspect-[3/4] md:aspect-[4/3] overflow-hidden relative">
              <img
                src="/shop/assets/hero-women.webp"
                alt="Новая коллекция"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/25 transition-colors duration-500" />
              <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                <p className="text-[0.6rem] font-light text-background/80 tracking-widest uppercase mb-1">
                  Весна-Лето 2026
                </p>
                <h2 className="text-lg md:text-xl lg:text-2xl font-light text-background tracking-wide">
                  Новая коллекция
                </h2>
                <span className="inline-block mt-2 text-[0.65rem] text-background border-b border-background/60 pb-0.5 tracking-wider group-hover:border-background transition-colors duration-300">
                  Смотреть
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default LargeHero;

