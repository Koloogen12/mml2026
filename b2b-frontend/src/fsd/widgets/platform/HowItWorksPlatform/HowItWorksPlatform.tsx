'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

import s from './HowItWorksPlatform.module.scss';

interface IStep {
  num: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface IContent {
  sectionLabel: string;
  title: string;
  subtitle: string;
  steps: IStep[];
}

interface IProps {
  className?: string;
  content: IContent;
}

export default function HowItWorksPlatform({ className, content }: IProps) {
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

          <p className={s.subtitle}>{content.subtitle}</p>
        </motion.div>

        <div className={s.steps}>
          {content.steps.map((step, i) => (
            <div key={i} className={s.stepWrapper}>
              <motion.div
                className={s.step}
                initial={{ opacity: 0, y: 48 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.18 }}
              >
                <div className={s.stepTop}>
                  <span className={s.stepNum}>{step.num}</span>

                  <div className={s.stepIconWrap}>{step.icon}</div>
                </div>

                <div className={s.stepContent}>
                  <h3 className={s.stepTitle}>{step.title}</h3>

                  <p className={s.stepDesc}>{step.description}</p>
                </div>
              </motion.div>

              {i < content.steps.length - 1 && (
                <motion.div
                  className={s.connector}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.18 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
