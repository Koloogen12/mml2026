import { motion } from 'framer-motion';
import Image from 'next/image';
import NextImage from 'next/image';
import React from 'react';

import IconLike from '@/fsd/shared/icons/IconLike';
import IconLikeFill from '@/fsd/shared/icons/IconLikeFill';
import IconShuffle from '@/fsd/shared/icons/IconShuffle';
import IconViewAll from '@/fsd/shared/icons/IconViewAll';

import s from './ChatMessage.module.scss';

export interface IProduct {
  name: string;
  image: string;
  price: number;
  discount_price?: number;
  color?: string;
  hex?: string;
  in_favorites?: boolean;
}

export interface IChatMessage {
  text: string;
  type: 'user' | 'bot';
  suggestions?: string[];
  products?: IProduct[];
}
interface IProps extends React.HTMLAttributes<HTMLDivElement> {
  message: IChatMessage;
}

const AgentChatMessage = React.forwardRef(
  ({ message, className, ...props }: IProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    return (
      <div
        ref={ref}
        className={`${className || ''} ${message.type === 'user' ? s.user : s.bot} ${s.container}`}
        {...props}
      >
        <div className={s.messageContainer}>
          <Image
            src={
              message.type === 'user'
                ? '/assets/images/chat/avatar.png'
                : '/assets/images/chat/chat-bot.svg'
            }
            width={54}
            height={54}
            alt={'avatar'}
          />

          <div className={`${s.message} ${message.type === 'user' ? s.userMessage : s.botMessage}`}>
            {message.text}
          </div>
        </div>

        {message.suggestions && message.suggestions.length && (
          <div className={`${s.suggestions}`}>
            {message.suggestions.map((suggestion, index) => (
              <p className={s.suggestion} key={index}>
                {suggestion}
              </p>
            ))}
          </div>
        )}

        {message.products && message.products.length && (
          <div className={s.messageProducts}>
            <div className={s.productHeader}>
              <div className={s.viewFullOutfits}>
                <IconViewAll />

                <p>View full outfits</p>
              </div>

              <div className={s.shuffle}>
                <p>Shuffle:</p>

                <IconShuffle />
              </div>
            </div>

            <div className={s.productGrid}>
              {message.products.map((product, index) => (
                <div className={s.productCard} key={index}>
                  <div className={s.productImageContainer}>
                    <NextImage
                      src={product.image}
                      alt={product.name || ''}
                      className={s.productImage}
                      width={150}
                      height={150}
                    />

                    {product.in_favorites ? (
                      <IconLikeFill className={s.productBadge} />
                    ) : (
                      <IconLike className={s.productBadge} />
                    )}
                  </div>

                  <div className={s.productInfo}>
                    <div className={s.productName}>{product.name}</div>

                    <div>
                      {product.discount_price ? (
                        <div className={s.discountPriceContainer}>
                          <p className={s.discountPrice}>{product.discount_price} $</p>

                          <p className={s.oldPrice}>{product.price} $</p>
                        </div>
                      ) : (
                        <p className={s.price}>{product.price} $</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

AgentChatMessage.displayName = 'ChatMessage';

export const AgentMotionChatMessage = motion(AgentChatMessage);
