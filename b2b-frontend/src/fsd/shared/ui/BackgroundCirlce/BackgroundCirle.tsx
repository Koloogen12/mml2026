import { HTMLAttributes } from 'react';

import s from './BackgroundCirlce.module.scss';

interface IProps extends HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  color?: string;
}

export default function BackgroundCirle({
  width = 240,
  color = '#CAC9EE',
  className,
  height = 240
}: IProps) {
  return (
    <div
      className={`${s.circle} ${className || ''}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: color
      }}
    ></div>
  );
}
