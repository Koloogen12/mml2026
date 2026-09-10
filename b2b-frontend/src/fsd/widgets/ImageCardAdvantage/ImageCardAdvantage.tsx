import Image from 'next/image';

import s from './ImageCardAdvantage.module.scss';

interface IImageAdvantageCard {
  title: string;
  text: string;
  comment: string;
  imagePathDesktop: string;
  imageSize: 'cover' | 'contain';
  imagePathMobile?: string;
}

interface IProps {
  className?: string;
  content: {
    cards: IImageAdvantageCard[];
  };
  stylization?: {
    title?: string;
    text?: string;
    comment?: string;
  };
}

export const ImageCardAdvantage = ({ className, content, stylization }: IProps) => {
  return (
    <section className={`${s.sectionImages} ${className || ''}`}>
      {content.cards.map((card, index) => (
        <div className={s.imageCard3} key={index}>
          <h4 className={`${s.imageCard2Title} ${stylization?.title || ''}`}>{card.title}</h4>

          {!card.imagePathMobile && (
            <div
              className={`${s.imageCardImg} ${card.imageSize === 'cover' ? s.imageCover : s.imageContain}} ${index === 0 ? s.imageAdvantage1 : ''}`}
            >
              <Image
                src={card.imagePathDesktop}
                alt="image"
                fill
                style={{
                  objectFit: card.imageSize
                }}
              />
            </div>
          )}

          {card.imagePathMobile && (
            <>
              <div
                className={`${s.imageCardImg} ${card.imageSize === 'cover' ? s.imageCover : s.imageContain}} visible-desktop ${index === 0 ? s.imageAdvantage1 : ''}`}
              >
                <Image src={card.imagePathDesktop} alt="image" fill />
              </div>

              <div
                className={`${s.imageCardImg} ${card.imageSize === 'cover' ? s.imageCover : s.imageContain}} visible-mobile ${index === 0 ? s.imageAdvantage1 : ''}`}
              >
                <Image src={card.imagePathMobile} alt="image" fill />
              </div>
            </>
          )}

          <div className={s.imageCard2Data}>
            <p className={`${s.imageCard2Text} ${stylization?.text || ''}`}>{card.text}</p>

            <p className={`${s.imageCard2TextComment} ${stylization?.comment || ''}`}>
              {card.comment}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};
