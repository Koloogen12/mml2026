import { ReactNode } from 'react';

import BackgroundCirle from '@/fsd/shared/ui/BackgroundCirlce/BackgroundCirle';
import Button from '@/fsd/shared/ui/Button/Button';

import s from './Contacts.module.scss';

interface IProps {
  className?: string;
  stylization?: {
    title?: string;
    btn?: string;
  };
  content: {
    title: ReactNode;
    textBtnApplication: string;
    textBtnTime: string;
  };
  onClickBtnApplication?: () => void;
  onClickBtnTime?: () => void;
}

export default function Contacts({
  className,
  content,
  stylization,
  onClickBtnApplication
}: IProps) {
  return (
    <section className={`${s.contactSection} ${className || ''}`}>
      <h1 className={`${s.title4} ${stylization?.title || ''}`} style={{ maxWidth: '700px' }}>
        {content.title}
      </h1>

      <div className={s.contactBtns}>
        <Button
          className={`${s.btn} ${stylization?.btn || ''} uix-x-button-secondary-solid`}
          onClick={onClickBtnApplication}
        >
          {content.textBtnApplication}
        </Button>

        <Button
          element="a"
          href="https://qlick.io/ru/widget/makemelook_b2b/meeting-30m/start"
          target="_blank"
          className={`${s.btn} ${stylization?.btn || ''} uix-x-button-secondary-solid`}
        >
          {content.textBtnTime}
        </Button>
      </div>

      <BackgroundCirle className={s.contactBgCircle1} />

      <BackgroundCirle className={s.contactBgCircle2} />
    </section>
  );
}
