import { FC } from 'react';

import { TLang } from '@/fsd/shared/types/lang';
import Button from '@/fsd/shared/ui/Button/Button';

import s from './VideoIntro.module.scss';

interface IProps {
  className?: string;
  lang: TLang;
  onClick: () => void;
}

const headings: Record<TLang, string> = {
  ru: 'Посмотрите на возможности виджета',
  en: "Look at the widget's capabilities"
};

const btnTexts: Record<TLang, string> = {
  ru: 'Хочу подключить виджет',
  en: 'I want to connect a widget'
};

export const VideoIntro: FC<IProps> = ({ lang, className, onClick }) => {
  return (
    <section className={`${s.outer} ${className || ''}`} id="video-intro">
      <div className={s.heading}>{headings[lang]}</div>

      <div className={s.videoOuter}>
        <div className={s.videoInner}>
          <video className={s.video} src="/widgetfit/widget-demo.mp4?v1" controls></video>
        </div>
      </div>

      <div className={s.btnOuter}>
        <Button
          onClick={onClick}
          preset="secondarySolid"
          className={`${s.btn} uix-x-button-primary-solid`}
        >
          {btnTexts[lang]}
        </Button>
      </div>
    </section>
  );
};
