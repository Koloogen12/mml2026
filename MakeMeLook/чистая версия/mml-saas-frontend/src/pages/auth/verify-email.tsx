import type { FC } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/components/ui/api-error';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuthStore } from '@/features/auth/auth-store';
import { authApi } from '@/shared/api';
import { getApiError } from '@/shared/api/error';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

const CODE_LENGTH = 6;

export const Component: FC = () => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const user = useAuthStore((s) => s.user);
  const handleAuthResponse = useAuthStore((s) => s.handleAuthResponse);
  const email = user?.email ?? '';

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load cooldown from server on mount
  useEffect(() => {
    authApi.getMe()
      .then((me) => setCountdown(me.verification_cooldown))
      .catch(() => { /* countdown stays 0 — safe default */ });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const digit = value.slice(-1);
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [code],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH);
    if (!pasted) return;

    const newCode = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      newCode[i] = char;
    });
    setCode(newCode);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }, []);

  const handleResend = async () => {
    setApiError('');
    try {
      await authApi.resendVerification({ email });
      const me = await authApi.getMe();
      setCountdown(me.verification_cooldown);
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    }
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setApiError('');
    setIsSubmitting(true);
    try {
      const data = await authApi.verifyEmail({ email, code: code.join('') });
      handleAuthResponse(data);
      navigate(lp('/'), { replace: true });
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isComplete = code.every((d) => d !== '');

  return (
    <AuthLayout>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="size-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(locale, 'verify.heading')}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t(locale, 'verify.subtitle')} <strong>{email}</strong>
        </p>
      </div>

      <ApiError message={apiError} />

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="size-12 text-center text-lg font-semibold tabular-nums p-0"
            />
          ))}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!isComplete || isSubmitting}
        >
          {isSubmitting ? t(locale, 'verify.submitting') : t(locale, 'verify.submit')}
        </Button>
      </form>

      <div className="text-center mt-6">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(locale, 'verify.resendIn')}{' '}
            <span className="font-medium text-foreground tabular-nums">
              {countdown}s
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors"
          >
            {t(locale, 'verify.resend')}
          </button>
        )}
      </div>
    </AuthLayout>
  );
};
