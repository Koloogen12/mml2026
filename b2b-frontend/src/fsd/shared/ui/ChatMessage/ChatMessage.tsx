import { motion } from 'framer-motion';
import Image from 'next/image';
import React from 'react';

import s from './ChatMessage.module.scss';

export interface IChatMessage {
  text: string;
  type: 'user' | 'bot';
}
interface IProps extends React.HTMLAttributes<HTMLDivElement> {
  message: IChatMessage;
}

const ChatMessage = React.forwardRef(
  ({ message, className, ...props }: IProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    return (
      <div
        ref={ref}
        className={`${className || ''} ${message.type === 'user' ? s.user : s.bot} ${s.container}`}
        {...props}
      >
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
    );
  }
);

ChatMessage.displayName = 'ChatMessage';

export const MotionChatMessage = motion(ChatMessage);
