'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

import { PLATFORM_REGISTER_URL } from '@/fsd/shared/config/platform';

import s from './PricingPlatform.module.scss';

interface IFeatureRow {
  label: string;
  starter: string | boolean;
  growth: string | boolean;
  enterprise: string | boolean;
}

interface IContent {
  sectionLabel: string;
  title: string;
  popularLabel: string;
  plans: {
    starter: { name: string; price: string; period: string; desc: string; cta: string };
    growth: { name: string; price: string; period: string; desc: string; cta: string };
    enterprise: { name: string; price: string; period: string; desc: string; cta: string };
  };
  features: IFeatureRow[];
}

interface IProps {
  className?: string;
  content: IContent;
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className={s.checkYes} aria-label="yes">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8l3.5 3.5L13 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (value === false) {
    return (
      <span className={s.checkNo} aria-label="no">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  return <span className={s.featureText}>{value}</span>;
}

export default function PricingPlatform({ className, content }: IProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const { starter, growth, enterprise } = content.plans;

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

        <div className={s.cards}>
          {[
            { plan: starter, key: 'starter', highlighted: false },
            { plan: growth, key: 'growth', highlighted: true },
            { plan: enterprise, key: 'enterprise', highlighted: false }
          ].map(({ plan, key, highlighted }, i) => (
            <motion.div
              key={key}
              className={`${s.card} ${highlighted ? s.cardHighlighted : ''}`}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.12 }}
            >
              {highlighted && <div className={s.popularBadge}>{content.popularLabel}</div>}

              <div className={s.cardHeader}>
                <div className={s.planName}>{plan.name}</div>

                <div className={s.priceRow}>
                  <span className={s.price}>{plan.price}</span>

                  <span className={s.period}>{plan.period}</span>
                </div>

                <p className={s.planDesc}>{plan.desc}</p>
              </div>

              <a
                href={PLATFORM_REGISTER_URL}
                className={`${s.ctaBtn} ${highlighted ? s.ctaBtnHighlighted : ''}`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div
          className={s.comparison}
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.thFeature} />

                <th className={s.th}>{starter.name}</th>

                <th className={`${s.th} ${s.thHighlighted}`}>{growth.name}</th>

                <th className={s.th}>{enterprise.name}</th>
              </tr>
            </thead>

            <tbody>
              {content.features.map((row, i) => (
                <tr key={i} className={s.row}>
                  <td className={s.tdLabel}>{row.label}</td>

                  <td className={s.td}>
                    <FeatureValue value={row.starter} />
                  </td>

                  <td className={`${s.td} ${s.tdHighlighted}`}>
                    <FeatureValue value={row.growth} />
                  </td>

                  <td className={s.td}>
                    <FeatureValue value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
