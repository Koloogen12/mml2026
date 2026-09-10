import Link from 'next/link';

import s from './Footer.module.scss';

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
  privacyText?: string;
  termsText?: string;
}

export default function Footer({ className, termsText, privacyText }: IProps) {
  return (
    <footer className={`${className || ''} ${s.container}`}>
      <div className={s.inner}>
        <div>2026 &copy; MakeMeLook</div>
        
        <a href="mailto:ceo@mhs.pro">ceo@mhs.pro</a>

        <Link href="https://www.makemelook.ai/privacy-policy" target="_blank">
          {privacyText || 'Политика конфиденциальности'}
        </Link>

        <Link href="https://www.makemelook.ai/user-agreement" target="_blank">
          {termsText || 'Условия использования сервиса'}
        </Link>
      </div>
    </footer>
  );
}
