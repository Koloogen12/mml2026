import { FC } from 'react';

import LogoBtn from '@/fsd/shared/icons/LogoBtn';
import Button from '@/fsd/shared/ui/Button/Button';

import s from './FixedBtn.module.scss';

type TProps = {
  className?: string;
  visible?: boolean;
  onClick: () => void;
};

export const FixedBtn: FC<TProps> = ({ className, visible, onClick }) => {
  return visible ? (
    <Button onClick={onClick} className={`${s.button} ${className || ''}`}>
      <LogoBtn />
    </Button>
  ) : null;
};
