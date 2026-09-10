'use client';

import { motion } from 'framer-motion';
import { ForwardedRef, forwardRef } from 'react';
import { useMediaQuery } from 'usehooks-ts';

import s from './BarChart.module.scss';

export interface IBarChartItem {
  label: string;
  description: string;
  values: number[];
}

interface IProps {
  item: IBarChartItem;
  className?: string;
  stylization?: {
    firstBar?: string;
    secondBar?: string;
  };
}

const BarChart = forwardRef(
  ({ item, className, stylization }: IProps, ref: ForwardedRef<HTMLDivElement>) => {
    const isDesktop = useMediaQuery('(min-width: 769px)', {
      initializeWithValue: true
    });

    return (
      <div ref={ref} className={`${className || ''} ${s.container}`}>
        <div className={s.content}>
          <motion.div
            animate={{
              [isDesktop ? 'width' : 'height']: `100%`,
              [!isDesktop ? 'width' : 'height']: `${item.values[0]}%`
            }}
            transition={{ delay: 0.5, duration: 0.5, type: 'easeInOut' }}
            layout
            viewport={{ once: true }}
            className={`${s.firstBar} ${stylization?.firstBar || ''}`}
          />

          <motion.div
            animate={{
              [isDesktop ? 'width' : 'height']: `100%`,
              [!isDesktop ? 'width' : 'height']: `${item.values[1]}%`
            }}
            transition={{ delay: 0.7, duration: 0.5, type: 'easeInOut' }}
            layout
            className={`${s.secondBar} ${stylization?.secondBar || ' '}`}
          />
        </div>

        <div className={s.info}>
          <p className={s.description}>{item.description}</p>

          <h5 className={s.label}>{item.label}</h5>
        </div>
      </div>
    );
  }
);

BarChart.displayName = 'BarChart';

export const MotionBarChart = motion(BarChart);
