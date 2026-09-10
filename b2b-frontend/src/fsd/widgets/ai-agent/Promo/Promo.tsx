import Image from 'next/image';
import { ReactNode } from 'react';

import Button from '@/fsd/shared/ui/Button/Button';
import SectionTitle from '@/fsd/shared/ui/SectionTitle';

import s from './Promo.module.scss';

interface IProps {
  className?: string;
  content: {
    titleSection: string;
    titleDesktop: ReactNode;
    titleMobile?: ReactNode;
    subTitle: string;
    btnText: string;
    image?: string;
  };
  onClick?: () => void;
}

export function Promo({ className, content, onClick }: IProps) {
  return (
    <section className={`${s.section} ${className || ''}`}>
      <SectionTitle text={content.titleSection} />

      <div className={s.container}>
        <h1 className={`${s.title} visible-desktop`}>{content.titleDesktop}</h1>

        <h1 className={`${s.title} visible-mobile`}>{content.titleMobile}</h1>

        <h3 className={s.subtitle}>{content.subTitle}</h3>

        <Button
          preset="secondarySolid"
          className={`${s.demoBtn} uix-x-button-primary-solid`}
          onClick={onClick}
        >
          {content.btnText}
        </Button>

        <div className={s.sliderContainer}>
          {content.image && <Image src={content.image} alt={''} fill />}
        </div>
      </div>
    </section>
  );
}
