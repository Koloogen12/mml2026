import { motion } from 'framer-motion';
import Link from 'next/link';

import IconLogo from '@/fsd/shared/icons/IconLogo';
import Button from '@/fsd/shared/ui/Button/Button';

import s from './Header.module.scss';

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
  btnText?: string;
  onClick: () => void;
  // When omitted, the default navigation (Demo shop + Blog) is shown.
  // Pass [] to render the header without any center nav.
  navLinks?: NavLink[];
}

const DEFAULT_NAV: NavLink[] = [
  // /shopping/ is served by a separate docker stack behind the edge nginx —
  // use a raw <a> so Next.js doesn't try to client-navigate inside its router.
  { label: 'Демо-магазин', href: '/shopping/', external: true },
  { label: 'Блог', href: '/ru/blog' }
];

export default function Header({
  className,
  btnText,
  onClick,
  navLinks = DEFAULT_NAV
}: IProps) {
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

        {navLinks.length > 0 && (
          <nav className={s.nav} aria-label="Основная навигация">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  className={s.navLink}
                  rel="noopener"
                >
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className={s.navLink}>
                  {link.label}
                </Link>
              )
            )}
          </nav>
        )}

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
