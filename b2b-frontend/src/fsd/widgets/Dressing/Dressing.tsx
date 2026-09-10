import { ReactNode, useEffect, useState } from 'react';
import { EffectCoverflow } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { SwiperOptions } from 'swiper/types';

import SliderItem, { ISliderItem } from '@/fsd/pages/HomePage/SliderItem/SliderItem';
import IconDots from '@/fsd/shared/icons/IconDots';
import IconSlider from '@/fsd/shared/icons/IconSlider';
import Button from '@/fsd/shared/ui/Button/Button';
import SectionTitle from '@/fsd/shared/ui/SectionTitle';

import s from './Dressing.module.scss';

const bgImagesArray = [
  '/assets/images/slider/bg/1.png',
  '/assets/images/slider/bg/2.png',
  '/assets/images/slider/bg/3.png',
  '/assets/images/slider/bg/4.png',
  '/assets/images/slider/bg/5.png',
  //   duplicate
  '/assets/images/slider/bg/1.png',
  '/assets/images/slider/bg/2.png',
  '/assets/images/slider/bg/3.png',
  '/assets/images/slider/bg/4.png',
  '/assets/images/slider/bg/5.png',
  //   duplicate
  '/assets/images/slider/bg/1.png',
  '/assets/images/slider/bg/2.png',
  '/assets/images/slider/bg/3.png',
  '/assets/images/slider/bg/4.png',
  '/assets/images/slider/bg/5.png'
];

const galleryBreakpoints: Record<number, SwiperOptions> = {
  769: {
    slidesPerView: 4,
    watchSlidesProgress: true
  },
  441: {
    slidesPerView: 3.4,
    watchSlidesProgress: true
  },
  376: {
    slidesPerView: 3,
    watchSlidesProgress: true
  },
  321: {
    slidesPerView: 2.6,
    watchSlidesProgress: true
  },
  320: {
    slidesPerView: 2,
    watchSlidesProgress: true
  }
};

interface IProps {
  className?: string;
  content: {
    titleSection: string;
    titleDesktop: ReactNode;
    titleMobile?: ReactNode;
    subTitle: string;
    btnText: string;
    bgImagesArray?: string[];
    slider: {
      title: string;
      text: string;
      imagePreview: string;
      slides: ISliderItem[];
    };
  };
  onClick?: () => void;
}

export function Dressing({ className, content, onClick }: IProps) {
  const [activeSlide, setActiveSlide] = useState(6);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      bgImagesArray.forEach((url) => (new Image().src = url));
    }
  }, []);

  const bgSliderImage = bgImagesArray[activeSlide];

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
          <div
            className={s.slider}
            style={{
              backgroundImage: `url(${bgSliderImage})`
            }}
          >
            <div className={s.sliderHeader}>
              <div className={s.sliderInfo}>
                <p className={s.sliderTitle}>{content.slider.title}</p>

                <p className={s.sliderText}>{content.slider.text}</p>
              </div>

              <div className={s.sliderSettings}>
                <IconDots />
              </div>
            </div>

            <Swiper
              effect="coverflow"
              modules={[EffectCoverflow]}
              loop
              centeredSlides
              initialSlide={activeSlide}
              autoplay={{ delay: 2500 }}
              grabCursor
              slideToClickedSlide
              breakpoints={galleryBreakpoints}
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 150,
                modifier: 2.1,
                slideShadows: false
              }}
              className={s.sliderContent}
              onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
            >
              {content.slider.slides.map((slide, id) => (
                <SwiperSlide key={id} className={s.sliderSlide} onChange={() => setActiveSlide(id)}>
                  <SliderItem item={slide} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <IconSlider className={s.sliderICon} />
        </div>
      </div>
    </section>
  );
}
