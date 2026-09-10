'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

import { PLATFORM_REGISTER_URL } from '@/fsd/shared/config/platform';

import s from './CtaSectionPlatform.module.scss';

interface IContent {
  title: string;
  subtitle: string;
  ctaText: string;
  secondaryText: string;
}

interface IProps {
  className?: string;
  content: IContent;
}

export default function CtaSectionPlatform({ className, content }: IProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className={`${className || ''} ${s.container}`}>
      <div className={s.glow} aria-hidden="true" />

      <div className={s.inner}>
        <motion.div
          className={s.content}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className={s.title}>{content.title}</h2>

          <p className={s.subtitle}>{content.subtitle}</p>

          <div className={s.actions}>
            <a href={PLATFORM_REGISTER_URL} className={s.ctaBtn}>
              {content.ctaText}
            </a>

            <p className={s.secondary}>{content.secondaryText}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
