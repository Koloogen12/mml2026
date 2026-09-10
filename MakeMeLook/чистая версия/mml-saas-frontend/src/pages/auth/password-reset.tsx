import type { FC } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Mail, ShieldCheck, Eye, EyeOff, Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/components/ui/api-error';
import { FieldErrorMessage } from '@/components/ui/field-error';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuthStore } from '@/features/auth/auth-store';
import { authApi } from '@/shared/api';
import { getApiError } from '@/shared/api/error';
import { generatePassword } from '@/shared/lib/generate-password';
import { t } from '@/shared/lib/i18n';
import { useLocale, type Locale } from '@/shared/lib/locale';

type Step = 'email' | 'code' | 'password';

const CODE_LENGTH = 6;
const RESEND_INTERVAL = 60;

// --- Step 1: Email ---

const emailSchema = z.object({
  email: z.email('Invalid email address'),
});

const StepEmailForm: FC<{
  locale: Locale;
  onNext: (email: string) => void;
  apiError: string;
  setApiError: (err: string) => void;
}> = ({ locale, onNext, apiError, setApiError }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmitEmail = async (data: z.infer<typeof emailSchema>) => {
    setApiError('');
    try {
      await authApi.passwordReset({ email: data.email });
      onNext(data.email);
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    }
  };

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(locale, 'reset.heading')}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t(locale, 'reset.subtitle')}
        </p>
      </div>

      <ApiError message={apiError} />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmitEmail)}>
        <div className="space-y-2">
          <Label htmlFor="email">{t(locale, 'reset.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t(locale, 'common.emailPlaceholder')}
            autoComplete="email"
            {...register('email')}
          />
          <FieldErrorMessage error={errors.email} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t(locale, 'reset.submitting')
            : t(locale, 'reset.submit')}
        </Button>
      </form>
    </>
  );
};

// --- Step 2: Code ---

const StepCodeForm: FC<{
  locale: Locale;
  email: string;
  onNext: (code: string) => void;
  apiError: string;
  setApiError: (err: string) => void;
}> = ({ locale, email, onNext, apiError, setApiError }) => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_INTERVAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
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
      await authApi.passwordReset({ email });
      setCountdown(RESEND_INTERVAL);
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    }
  };

  const handleVerifyCode = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setApiError('');
    setIsSubmitting(true);
    const codeStr = code.join('');
    try {
      await authApi.passwordResetVerify({ email, code: codeStr });
      onNext(codeStr);
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isComplete = code.every((d) => d !== '');

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="size-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(locale, 'reset.codeHeading')}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t(locale, 'reset.codeSent')} <strong>{email}</strong>
        </p>
      </div>

      <ApiError message={apiError} />

      <form className="space-y-6" onSubmit={handleVerifyCode}>
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
          {isSubmitting
            ? t(locale, 'reset.verifying')
            : t(locale, 'reset.verifyCode')}
        </Button>
      </form>

      <div className="text-center mt-6">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(locale, 'reset.resendIn')}{' '}
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
            {t(locale, 'reset.resend')}
          </button>
        )}
      </div>
    </>
  );
};

// --- Step 3: New Password ---

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
      .regex(/\d/, 'Must contain at least 1 digit'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const StepPasswordForm: FC<{
  email: string;
  code: string;
  apiError: string;
  setApiError: (err: string) => void;
}> = ({ email, code, apiError, setApiError }) => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const handleAuthResponse = useAuthStore((s) => s.handleAuthResponse);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  const handleGeneratePassword = () => {
    const password = generatePassword();
    setValue('password', password, { shouldValidate: true });
    setValue('confirmPassword', password, { shouldValidate: true });
    setShowPassword(true);
    setShowConfirm(true);
  };

  const onSubmitPassword = async (data: z.infer<typeof passwordSchema>) => {
    setApiError('');
    try {
      const res = await authApi.passwordResetComplete({
        email,
        code,
        password: data.password,
        confirm_password: data.confirmPassword,
      });
      handleAuthResponse(res);
      navigate(lp('/'), { replace: true });
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    }
  };

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="size-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(locale, 'reset.newPasswordHeading')}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t(locale, 'reset.newPasswordSubtitle')}
        </p>
      </div>

      <ApiError message={apiError} />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmitPassword)}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t(locale, 'reset.newPassword')}</Label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              tabIndex={-1}
            >
              <Dices className="size-3.5" />
              {t(locale, 'reset.generate')}
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t(locale, 'reset.minChars')}
              autoComplete="new-password"
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <FieldErrorMessage error={errors.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">
            {t(locale, 'reset.confirmNewPassword')}
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              placeholder={t(locale, 'reset.repeatPassword')}
              autoComplete="new-password"
              className="pr-10"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <FieldErrorMessage error={errors.confirmPassword} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t(locale, 'reset.resetting')
            : t(locale, 'reset.resetSubmit')}
        </Button>
      </form>
    </>
  );
};

// --- Main Component ---

export const Component: FC = () => {
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [apiError, setApiError] = useState('');

  const handleEmailNext = (emailValue: string) => {
    setEmail(emailValue);
    setApiError('');
    setStep('code');
  };

  const handleCodeNext = (codeValue: string) => {
    setCode(codeValue);
    setApiError('');
    setStep('password');
  };

  return (
    <AuthLayout>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['email', 'code', 'password'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`size-2 rounded-full transition-colors ${
                s === step
                  ? 'bg-primary'
                  : i < ['email', 'code', 'password'].indexOf(step)
                    ? 'bg-primary/40'
                    : 'bg-border'
              }`}
            />
            {i < 2 && (
              <div
                className={`w-8 h-px transition-colors ${
                  i < ['email', 'code', 'password'].indexOf(step)
                    ? 'bg-primary/40'
                    : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 'email' && (
        <StepEmailForm
          locale={locale}
          onNext={handleEmailNext}
          apiError={apiError}
          setApiError={setApiError}
        />
      )}
      {step === 'code' && (
        <StepCodeForm
          locale={locale}
          email={email}
          onNext={handleCodeNext}
          apiError={apiError}
          setApiError={setApiError}
        />
      )}
      {step === 'password' && (
        <StepPasswordForm
          email={email}
          code={code}
          apiError={apiError}
          setApiError={setApiError}
        />
      )}

      <p className="text-center text-sm text-muted-foreground mt-6">
        <Link
          to={lp('/auth/login')}
          className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors"
        >
          {t(locale, 'reset.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  );
};
