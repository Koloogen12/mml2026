import { motion } from 'framer-motion';
import NextImage from 'next/image';

import IconScan from '@/fsd/shared/icons/IconScan';
import IconComponent from '@/fsd/shared/ui/IconComponent/IconComponent';

import s from './ImageCardFeature.module.scss';

interface IImageFeatureCard {
  text: string;
  imagePathDesktop: string;
  imageSizeDesktop: 'cover' | 'contain';
  imageSizeMobile?: 'cover' | 'contain';
  imagePathMobile?: string;
  customImageDesktopClassName?: string;
  customImageMobileClassName?: string;
  customTextClassName?: string;
  onClick?: () => void;
}

interface IProps {
  className?: string;
  content: {
    cardMain: {
      text: string;
      image1: string;
      image2: string;
      image3: string;
    };
    cards: IImageFeatureCard[];
  };
}

export default function ImageCardFeature({ className, content }: IProps) {
  return (
    <section className={`${s.sectionImages} ${className || ''}`}>
      <div className={`${s.titleWithIcon} ${s.titleWithIconMainMobile}`}>
        <p className={s.titleWithIconTitle}>{content.cardMain.text}</p>

        <IconComponent
          icon={<IconScan />}
          className={s.titleWithIconIcon}
          bgColor="#f2e9ff"
          iconColor="#9747ff"
        />
      </div>

      <div className={`${s.imageCard} ${s.imageCardMain}`}>
        <div className={s.imageCardMainImg}>
          <motion.div
            className={s.imageCardMainContainer}
            initial={{
              opacity: 0
            }}
            whileInView={{
              opacity: 1,
              zIndex: 2
            }}
            transition={{
              duration: 0.5
            }}
            viewport={{
              once: true,
              margin: '0px 0px -100px 0px'
            }}
          >
            <NextImage src={content.cardMain.image1} alt="image" fill />
          </motion.div>

          <motion.div
            className={s.imageCardMainContainer}
            initial={{
              opacity: 0
            }}
            whileInView={{
              opacity: 0.5,
              x: '100px',
              y: '15px',
              scale: 0.9,
              rotate: '5deg',
              zIndex: 1
            }}
            transition={{
              duration: 0.5,
              delay: 0.3
            }}
            viewport={{
              once: true,
              margin: '0px 0px -100px 0px'
            }}
          >
            <NextImage src={content.cardMain.image2} alt="image" fill />
          </motion.div>

          <motion.div
            className={s.imageCardMainContainer}
            initial={{
              opacity: 0
            }}
            whileInView={{
              opacity: 0.5,
              x: '-100px',
              y: '15px',
              scale: 0.9,
              rotate: '-5deg',
              zIndex: 1
            }}
            transition={{
              duration: 0.5,
              delay: 0.6
            }}
            viewport={{
              once: true,
              margin: '0px 0px -100px 0px'
            }}
          >
            <NextImage src={content.cardMain.image3} alt="image" fill />
          </motion.div>
        </div>

        <div className={`${s.titleWithIcon} ${s.titleWithIconMainDesktop}`}>
          <p className={s.titleWithIconTitle}>{content.cardMain.text}</p>

          <IconComponent
            icon={<IconScan />}
            className={s.titleWithIconIcon}
            bgColor="#f2e9ff"
            iconColor="#9747ff"
          />
        </div>
      </div>

      {content.cards.map((card, index) => (
        <div className={s.imageCard} key={index}>
          {!card.imagePathMobile && (
            <div
              className={`${s.imageCardImg} ${card.imageSizeDesktop === 'cover' ? s.imageCover : s.imageContain} ${card.customImageDesktopClassName ? s[card.customImageDesktopClassName] : ''} `}
            >
              <NextImage src={card.imagePathDesktop} alt="image" fill />
            </div>
          )}

          {card.imagePathMobile && (
            <>
              <div
                className={`${s.imageCardImg} ${card.imageSizeDesktop === 'cover' ? s.imageCover : s.imageContain} visible-desktop ${card.customImageDesktopClassName ? s[card.customImageDesktopClassName] : ''}`}
              >
                <NextImage src={card.imagePathDesktop} alt="image" fill />
              </div>

              <div
                className={`${s.imageCardImg} ${card?.imageSizeMobile === 'cover' ? s.imageCover : s.imageContain} visible-mobile ${card.customImageMobileClassName ? s[card.customImageMobileClassName] : ''}`}
              >
                <NextImage src={card.imagePathMobile} alt="image" fill />
              </div>
            </>
          )}

          <p
            className={`${s.imageCardText} ${card.customTextClassName ? s[card.customTextClassName] : ''}`}
          >
            {card.text}
          </p>
        </div>
      ))}
    </section>
  );
}
