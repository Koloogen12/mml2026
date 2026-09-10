import NextImage from 'next/image';

import s from './ImageCardPossibility.module.scss';

interface IImagePossibilityCard {
  text: string;
  comment: string;
  imagePathDesktop: string;
  imageSize: 'cover' | 'contain';
  imagePathMobile?: string;
  customImageClassName?: string;
  onClick?: () => void;
}

interface IProps {
  className?: string;
  content: {
    cards: IImagePossibilityCard[];
  };
  stylization?: {
    title?: string;
    text?: string;
    comment?: string;
  };
}

export default function ImageCardPossibility({ className, content }: IProps) {
  return (
    <section className={`${s.sectionImages} ${className || ''}`}>
      {content.cards.map((card, index) => (
        <div className={`${s.imageCard2} ${s.imageCardSmallH}`} key={index}>
          {!card.imagePathMobile && (
            <div
              className={`${s.imageCardImg} ${card.imageSize === 'cover' ? s.imageCover : s.imageContain} ${card.customImageClassName ? s[card.customImageClassName] : ''}`}
              onClick={card.onClick}
              style={{
                cursor: card.onClick ? 'pointer' : 'default'
              }}
            >
              <NextImage src={card.imagePathDesktop} alt="image" fill />
            </div>
          )}

          {card.imagePathMobile && (
            <>
              <div
                className={`${s.imageCardImg} ${card.imageSize === 'cover' ? s.imageCover : s.imageContain} visible-desktop ${card.customImageClassName ? s[card.customImageClassName] : ''}`}
                style={{
                  cursor: card.onClick ? 'pointer' : 'default'
                }}
                onClick={card.onClick}
              >
                <NextImage src={card.imagePathDesktop} alt="image" fill />
              </div>

              <div
                className={`${s.imageCardImg} ${card.imageSize === 'cover' ? s.imageCover : s.imageContain} visible-mobile ${card.customImageClassName ? s[card.customImageClassName] : ''}`}
                style={{
                  cursor: card.onClick ? 'pointer' : 'default'
                }}
                onClick={card.onClick}
              >
                <NextImage src={card.imagePathMobile} alt="image" fill />
              </div>
            </>
          )}

          <div className={s.imageCard2Data}>
            <p className={s.imageCard2Text}>{card.text}</p>

            <p className={s.imageCard2TextComment2}>{card.comment}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
