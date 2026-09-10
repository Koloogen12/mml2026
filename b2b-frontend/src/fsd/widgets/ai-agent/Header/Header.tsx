import { motion } from 'framer-motion';
import Link from 'next/link';

import IconLogo from '@/fsd/shared/icons/IconLogo';
import Button from '@/fsd/shared/ui/Button/Button';

import s from './Header.module.scss';

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
  btnText?: string;
  onClick: () => void;
}

export default function Header({ className, btnText, onClick }: IProps) {
  return (
    <header className={`${className || ''} ${s.container}`}>
      <motion.div
        className={s.inner}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.3
        }}
      >
        <Link href="/" className={s.logo}>
          <IconLogo />
        </Link>

        <Button
          onClick={onClick}
          preset="secondarySolid"
          className={`${s.btn} uix-x-button-primary-solid`}
        >
          {btnText || 'Получить демо'}
        </Button>
      </motion.div>
    </header>
  );
}
