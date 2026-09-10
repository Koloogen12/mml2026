import { LayoutGroup, motion } from 'framer-motion';
import { ReactNode } from 'react';

import s from './Steps.module.scss';

export interface IStep {
  content: ReactNode | string;
  data?: string;
  active?: boolean;
}

interface IProps {
  contentClassName?: string;
  label?: string;
  steps: IStep[];
  className?: string;
  stepClassName?: string;
  onClickId: (id: number) => void;
  onSendData?: (data: string) => void;
  layoutId?: string;
}

export default function Steps({
  contentClassName,
  steps,
  className,
  onClickId,
  stepClassName,
  onSendData,
  layoutId = 'steps'
}: IProps) {
  const handleClick = (step: IStep, id: number) => {
    onClickId(id);
    if (onSendData && step.data) {
      onSendData(step.data);
    }
  };

  return (
    <LayoutGroup id={layoutId}>
      <div className={`${className || ''} ${s.container}`}>
        {steps.map((step, id) => (
          <div
            key={id}
            className={`${s.step} ${stepClassName || ''}`}
            onClick={() => handleClick(step, id)}
            tabIndex={id}
          >
            {step.active && (
              <motion.div
                transition={{
                  layout: {
                    duration: 0.3,
                    ease: 'easeInOut'
                  }
                }}
                style={{
                  borderRadius: '8px',
                  background: 'var(--text-primaryColor)'
                }}
                className={s.stepActive}
                layoutId="activeStep"
              />
            )}

            <p
              className={`${s.content} ${contentClassName || ''}`}
              style={{
                color: step.active ? 'var(--text-whiteColor)' : ' '
              }}
            >
              {step.content}
            </p>
          </div>
        ))}
      </div>
    </LayoutGroup>
  );
}
