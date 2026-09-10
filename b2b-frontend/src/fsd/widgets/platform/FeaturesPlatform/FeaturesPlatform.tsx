'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

import s from './FeaturesPlatform.module.scss';

interface IFeature {
  icon: React.ReactNode;
  metric: string;
  title: string;
  description: string;
}

interface IContent {
  sectionLabel: string;
  title: string;
  features: IFeature[];
}

interface IProps {
  className?: string;
  content: IContent;
}

const IconConversion = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path
      d="M4 20L10 14L14 18L20 10L24 14"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M20 10h4v4"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconReturns = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.2" />

    <path
      d="M14 9v5l3 3"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M8 5L5 8l3 3"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconIntegration = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="4" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2.2" />

    <path d="M4 11h20" stroke="currentColor" strokeWidth="2.2" />

    <path d="M9 15h2M13 15h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const IconAI = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.2" />

    <path
      d="M9 14c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />

    <circle cx="14" cy="14" r="2" fill="currentColor" />

    <path
      d="M14 4v2M14 22v2M4 14h2M22 14h2"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export default function FeaturesPlatform({ className, content }: IProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className={`${className || ''} ${s.container}`}>
      <div className={s.inner}>
        <motion.div
          className={s.header}
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className={s.sectionLabel}>{content.sectionLabel}</span>

          <h2 className={s.title}>{content.title}</h2>
        </motion.div>

        <div className={s.grid}>
          {content.features.map((feature, i) => (
            <motion.div
              key={i}
              className={s.card}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.1 }}
            >
              <div className={s.iconWrap}>{feature.icon}</div>

              <div className={s.metric}>{feature.metric}</div>

              <h3 className={s.cardTitle}>{feature.title}</h3>

              <p className={s.cardDesc}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { IconConversion, IconReturns, IconIntegration, IconAI };
