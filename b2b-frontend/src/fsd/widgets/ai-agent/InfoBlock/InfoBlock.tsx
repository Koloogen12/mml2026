import { CSSProperties, ReactNode } from 'react';

import s from './InfoBlock.module.scss';

interface IProps {
  className?: string;
  style?: CSSProperties;
  content: {
    textBlocks: ReactNode[];
  };
  stylization?: {
    textBlock?: string;
  };
}

export default function InfoBlock({ className, style, content, stylization }: IProps) {
  return (
    <section className={`${s.sectionInfo} ${className || ''}`} style={style}>
      <div className={s.infoContainer}>
        {content.textBlocks.map((textBlock, index) => (
          <div className={`${s.infoItem} ${stylization?.textBlock || ''}`} key={index}>
            {textBlock}
          </div>
        ))}
      </div>
    </section>
  );
}
