import type { FC } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/components/ui/api-error';
import { FieldErrorMessage } from '@/components/ui/field-error';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuthStore } from '@/features/auth/auth-store';
import { authApi } from '@/shared/api';
import { getApiError } from '@/shared/api/error';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

const schema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export const Component: FC = () => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const handleAuthResponse = useAuthStore((s) => s.handleAuthResponse);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const res = await authApi.login({
        email: data.email,
        password: data.password,
      });
      handleAuthResponse(res);
      const dest =
        res.user.status === 'pending_verification' ? '/auth/verify-email' : '/';
      navigate(lp(dest), { replace: true });
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">{t(locale, 'login.heading')}</h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t(locale, 'login.subtitle')}
        </p>
      </div>

      <ApiError message={apiError} />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="email">{t(locale, 'login.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t(locale, 'common.emailPlaceholder')}
            autoComplete="email"
            {...register('email')}
          />
          <FieldErrorMessage error={errors.email} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t(locale, 'login.password')}</Label>
            <Link
              to={lp('/auth/password-reset')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              {t(locale, 'login.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t(locale, 'login.enterPassword')}
              autoComplete="current-password"
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

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? t(locale, 'login.submitting') : t(locale, 'login.submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {t(locale, 'login.noAccount')}{' '}
        <Link
          to={lp('/auth/register')}
          className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors"
        >
          {t(locale, 'login.createOne')}
        </Link>
      </p>
    </AuthLayout>
  );
};
