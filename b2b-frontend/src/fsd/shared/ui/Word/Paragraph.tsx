import { motion, MotionValue, useScroll, useTransform } from 'framer-motion';
import React, { Children, Fragment, ReactNode, useMemo, useRef } from 'react';

import s from './Word.module.scss';

interface IProps {
  value?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function Paragraph({ children, className }: IProps) {
  const element = useRef(null);
  const { scrollYProgress } = useScroll({
    target: element,
    offset: ['start 70%', 'start 50%']
  });

  const mappedChildren = useMemo(
    () =>
      Children.map(children, (child: React.ReactNode) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props
          });
        }
        return null;
      }),
    [children]
  );

  return (
    <span className={`${s.wrapper} ${className || ''}`} ref={element}>
      {mappedChildren &&
        mappedChildren.map((child: React.ReactElement, i) => {
          const start = i / mappedChildren.length;
          const end = start + 1 / mappedChildren.length;
          if (!child.props.children) {
            return (
              <Icon range={[start, end]} progress={scrollYProgress} key={child.key}>
                {child}
              </Icon>
            );
          } else {
            return (
              <Sentence range={[start, end]} progress={scrollYProgress} key={child.key}>
                {child.props.children}
              </Sentence>
            );
          }
        })}
    </span>
  );
}

interface ISentenceProps {
  children: string;
  range: number[];
  progress: MotionValue<number>;
}

const Sentence = ({ children, range, progress }: ISentenceProps) => {
  const words: string[] = children.split(' ');
  const amount = range[1] - range[0];
  const step = amount / words.length;

  return (
    <span className={s.paragraph}>
      <span className={s.srOnly}>{children}</span>

      {words.map((word, i) => {
        const start = range[0] + step * i;
        const end = range[0] + step * (i + 1);
        return (
          <Fragment key={i}>
            <Word range={[start, end]} progress={progress}>
              {word}
            </Word>

            <span className={s.wordSpace}>&nbsp;</span>
          </Fragment>
        );
      })}
    </span>
  );
};

const Word = ({ children, range, progress }: ISentenceProps) => {
  const opacity = useTransform(progress, range, [0.5, 1]);
  return (
    <span className={s.word}>
      <motion.span
        style={{
          opacity
        }}
      >
        {children}
      </motion.span>
    </span>
  );
};

interface IIconProps {
  children: ReactNode;
  range: number[];
  progress: MotionValue<number>;
}

const Icon = ({ children, range, progress }: IIconProps) => {
  const opacity = useTransform(progress, range, [0.5, 1]);
  return (
    <span className={s.word}>
      <motion.span
        style={{
          opacity
        }}
      >
        {children}
      </motion.span>
    </span>
  );
};
