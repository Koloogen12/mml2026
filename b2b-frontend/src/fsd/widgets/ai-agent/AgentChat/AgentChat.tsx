import { motion, Variants } from 'framer-motion';

import IconArrow from '@/fsd/shared/icons/IconArrow';
import BackgroundCirle from '@/fsd/shared/ui/BackgroundCirlce/BackgroundCirle';
import Button from '@/fsd/shared/ui/Button/Button';
import { IChatMessage } from '@/fsd/shared/ui/ChatMessage/ChatMessage';
import SectionTitle from '@/fsd/shared/ui/SectionTitle';
import { AgentMotionChatMessage } from '@/fsd/widgets/ai-agent/AgentChat/AgentChatMessage/AgentChatMessage';

import s from './Chat.module.scss';

const chatVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  whileInView: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.3
    }
  }
};

interface IProps {
  className?: string;
  content: {
    titleSection?: string;
    title?: string;
    textBtn?: string;
    chat?: IChatMessage[];
  };
  onClick?: () => void;
  stylization?: {
    title?: string;
    btn?: string;
    chat?: string;
  };
}

export default function AgentChat({ content, stylization, className, onClick }: IProps) {
  return (
    <section className={`${s.sectionTitle} ${className || ''}`}>
      <SectionTitle text={content.titleSection || ''} />

      <div className={s.container}>
        <h1 className={`${s.title3} ${stylization?.title || ''}`}>{content.title}</h1>

        <motion.div
          className={`${s.chat} ${stylization?.chat || ''}`}
          variants={chatVariants}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
        >
          {content.chat &&
            content.chat.map((message) => (
              <AgentMotionChatMessage
                message={message}
                key={message.text}
                variants={chatVariants}
              />
            ))}

          <Button
            className={`${s.chatBtn} ${stylization?.btn || ''} uix-x-button-thirdly-solid`}
            onClick={onClick}
          >
            <span>{content.textBtn}</span>

            <IconArrow className={s.chatBtnIcon} />
          </Button>
        </motion.div>

        <BackgroundCirle className={s.chatBgCircle1} width={380} height={380} />

        <BackgroundCirle className={s.chatBgCircle2} width={380} height={380} />

        <BackgroundCirle className={s.chatBgCircle3} width={380} height={380} />
      </div>
    </section>
  );
}
