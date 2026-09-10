import { ReactNode } from 'react';

import s from './SectionTitle.module.scss';

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
  text: ReactNode;
}
export default function SectionTitle({ className, text }: IProps) {
  return (
    <div className={`${className || ''} ${s.container}`}>
      <p className={s.text}>{text}</p>
    </div>
  );
}
