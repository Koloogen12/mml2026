import { useRef } from 'react';
import ReactSlider from 'react-slider';
import { useResizeObserver } from 'usehooks-ts';

import { TLang } from '@/fsd/shared/types/lang';

import s from './InputRange.module.scss';

interface IInputRange {
  _value: number;
  min: number;
  max: number;
  marks: number[];
  step?: number;
  onChange: (value: number) => void;
}

interface IProps {
  className?: string;
  item: IInputRange;
  lang: TLang;
}
const locales: Record<TLang, string> = {
  ru: 'ru-RU',
  en: 'en-EN'
};

const formatNumber = (amount: number, lang: TLang) =>
  new Intl.NumberFormat(locales[lang], {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(amount);

export default function InputRange({ className, item, lang }: IProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { width = 0 } = useResizeObserver({
    ref,
    box: 'border-box'
  });

  return (
    <div className={s.container}>
      <div className={`${s.wrapper} ${className || ''}`}>
        <ReactSlider
          renderMark={({ key, ...otherProps }) => (
            <span
              {...otherProps}
              key={key}
              className={`${s.mark} ${key !== item.max && key !== item.min && s.markMid} ${key === item.max && s.markMax} ${key === item.min && s.markMin}`}
            >
              {formatNumber(Number(key), lang)}
            </span>
          )}
          renderThumb={(props, state) => {
            const isLeft = state.valueNow < item?.max / 2;

            const thumbStyle = isLeft
              ? { right: '-47px', left: 'auto' }
              : { left: 'auto', right: `${width + 10}px` };

            const triangleStyle = isLeft
              ? {
                  left: '-6px',
                  right: 'auto',
                  transform: 'rotate(180deg) translateY(40%)'
                }
              : {
                  right: '-6px',
                  left: 'auto'
                };

            return (
              <div {...props} key={props.key} className={s.thumb}>
                <span className={s.thumbBage} style={thumbStyle} ref={ref}>
                  {formatNumber(state.valueNow, lang)}

                  <span className={s.triangle} style={triangleStyle} />
                </span>
              </div>
            );
          }}
          trackClassName={s.track}
          value={item._value}
          min={item.min}
          max={item.max}
          marks={item.marks}
          step={item.step}
          onChange={(value) => item.onChange(value)}
        />
      </div>
    </div>
  );
}
