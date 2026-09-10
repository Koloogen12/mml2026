'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

import s from './FaqPlatform.module.scss';

interface IFaqItem {
  question: string;
  answer: string;
}

interface IContent {
  sectionLabel: string;
  title: string;
  items: IFaqItem[];
}

interface IProps {
  className?: string;
  content: IContent;
}

export default function FaqPlatform({ className, content }: IProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

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

        <motion.div
          className={s.list}
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {content.items.map((item, i) => (
            <div key={i} className={`${s.item} ${openIndex === i ? s.itemOpen : ''}`}>
              <button className={s.question} onClick={() => toggle(i)}>
                <span>{item.question}</span>

                <span className={s.icon} aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{
                      transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s'
                    }}
                  >
                    <path
                      d="M5 7.5l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    className={s.answer}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className={s.answerInner}>{item.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
