import { type FC, useState, useRef, useEffect, useCallback } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import iconGoogle from '@/assets/img/icon-google.svg';
import iconYandex from '@/assets/img/icon-yandex.svg';
import { sendAuthCode, verifyAuthCode, getApiBaseUrl } from '@/api';

function isEmailContact(contact: string): boolean {
  return contact.includes('@') && contact.includes('.');
}

/* OTP input — 6 individual digit cells */
const OtpInput: FC<{
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  length?: number;
}> = ({ value, onChange, error, length = 6 }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split('');
    arr[idx] = char;
    const next = arr.join('').slice(0, length);
    onChange(next);
    if (char && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className="mml-otp">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`mml-otp__cell ${error ? 'mml-otp__cell--error' : ''} ${value[i] ? 'mml-otp__cell--filled' : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
};

export const AuthStage: FC = () => {
  const goBack = useWidgetStore((s) => s.goBack);
  const setAuthenticated = useWidgetStore((s) => s.setAuthenticated);
  const setEmail = useWidgetStore((s) => s.setEmail);
  const setPhone = useWidgetStore((s) => s.setPhone);
  const sessionToken = useWidgetStore((s) => s.sessionToken);

  const [input, setInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    if (!input.trim() || !sessionToken || sending) return;
    setSending(true);
    try {
      await sendAuthCode(sessionToken, input.trim());
      setCodeSent(true);
      setCooldown(60);
      setCode('');
      setCodeError(false);
    } catch {
      // silently fail — code logged on backend in dev
      setCodeSent(true);
      setCooldown(60);
    } finally {
      setSending(false);
    }
  }, [input, sessionToken, sending]);

  const handleVerifyCode = useCallback(async () => {
    if (code.length < 6 || !sessionToken) return;
    try {
      const resp = await verifyAuthCode(sessionToken, input.trim(), code);
      if (resp.is_authenticated) {
        if (isEmailContact(input.trim())) {
          setEmail(input.trim());
        } else {
          setPhone(input.trim());
        }
        setAuthenticated(true);
        goBack();
      } else {
        setCodeError(true);
      }
    } catch {
      setCodeError(true);
    }
   }, [code, sessionToken, input, setEmail, setPhone, setAuthenticated, goBack]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !codeError) {
      handleVerifyCode();
    }
  }, [code, codeError, handleVerifyCode]);

  const handleResend = () => {
    if (cooldown > 0) return;
    handleSendCode();
  };

  // Listen for OAuth popup result
  useEffect(() => {
    const expectedOrigin = (() => {
      try { return new URL(getApiBaseUrl()).origin; } catch { return null; }
    })();
    const handler = (e: MessageEvent) => {
      // Validate origin to prevent cross-origin token theft
      if (expectedOrigin && e.origin !== expectedOrigin) return;
      if (!e.data || e.data.type !== 'mml-oauth-result') return;
      if (e.data.status === 'success' && e.data.email) {
        setEmail(e.data.email);
        setAuthenticated(true);
        goBack();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setEmail, setAuthenticated, goBack]);

  const handleOAuth = (provider: 'google' | 'yandex') => {
    if (!sessionToken) return;
    const base = getApiBaseUrl();
    // OAuth redirects live under /api/v1/widget/auth/* (a separate route group
    // from the regular /api/widget/v1/* widget API, because OAuth callbacks
    // are browser navigations and don't need the widget-CORS middleware).
    const url = `${base}/api/v1/widget/auth/${provider}?session=${sessionToken}`;
    const w = 500;
    const h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open(url, 'mml-oauth', `width=${w},height=${h},left=${left},top=${top}`);
  };

  const isEmail = isEmailContact(input);
  const formatCooldown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="mml-auth">
      <div className="mml-auth__backdrop" />

      <div className="mml-auth__modal">
        <button className="mml-auth__close" onClick={goBack} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        {!codeSent ? (
          <>
            <div className="mml-auth__header">
              <h2 className="mml-auth__title">{t('auth.heading')}</h2>
              <p className="mml-auth__subtitle">{t('auth.subheading')}</p>
            </div>

            <div className="mml-auth__form">
              <input
                className="mml-auth__input"
                type="text"
                placeholder={t('auth.inputPlaceholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              />
              <button
                className={`mml-onboarding__cta ${!input.trim() ? 'mml-onboarding__cta--disabled' : ''}`}
                style={{ width: '100%' }}
                onClick={handleSendCode}
              >
                <span className="mml-onboarding__cta-text">{t('auth.sendCode')}</span>
              </button>
            </div>

            <div className="mml-auth__oauth">
              <p className="mml-auth__oauth-label">{t('auth.oauthLabel')}</p>
              <div className="mml-auth__oauth-buttons">
                <button className="mml-auth__oauth-btn" onClick={() => handleOAuth('google')}>
                  <img src={iconGoogle} alt="" width="20" height="20" />
                  <span>{t('auth.googleId')}</span>
                </button>
                <button className="mml-auth__oauth-btn" onClick={() => handleOAuth('yandex')}>
                  <img src={iconYandex} alt="" width="20" height="20" />
                  <span>{t('auth.yandexId')}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mml-auth__header">
              <h2 className="mml-auth__title">
                {isEmail ? t('auth.codeHeadingEmail') : t('auth.codeHeadingSms')}
              </h2>
              <p className="mml-auth__subtitle">
                {isEmail ? t('auth.codeSentEmail') : t('auth.codeSentSms')}
              </p>
              <a
                className="mml-auth__contact-link"
                onClick={() => { setCodeSent(false); setCode(''); setCodeError(false); }}
              >
                {input}
              </a>
            </div>

            <OtpInput
              value={code}
              onChange={(v) => { setCode(v); setCodeError(false); }}
              error={codeError}
            />

            <div className="mml-auth__form" style={{ gap: '12px' }}>
              <button
                className={`mml-onboarding__cta ${code.length < 6 ? 'mml-onboarding__cta--disabled' : ''}`}
                style={{ width: '100%' }}
                onClick={handleVerifyCode}
              >
                <span className="mml-onboarding__cta-text">{t('auth.next')}</span>
              </button>

              <button
                className={`mml-auth__resend ${cooldown > 0 ? 'mml-auth__resend--disabled' : ''}`}
                onClick={handleResend}
                disabled={cooldown > 0}
              >
                {cooldown > 0
                  ? `${t('auth.resendCode')} ${formatCooldown(cooldown)}`
                  : t('auth.resendCode')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
