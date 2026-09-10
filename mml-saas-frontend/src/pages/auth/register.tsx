import type { FC } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiError } from '@/components/ui/api-error';
import { FieldErrorMessage } from '@/components/ui/field-error';
import { AuthLayout } from '@/features/auth/auth-layout';
import { useAuthStore } from '@/features/auth/auth-store';
import { authApi } from '@/shared/api';
import { getApiError } from '@/shared/api/error';
import { generatePassword } from '@/shared/lib/generate-password';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
      .regex(/\d/, 'Must contain at least 1 digit'),
    confirmPassword: z.string(),
    terms: z
      .boolean()
      .refine((v) => v, { message: 'You must accept the terms' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export const Component: FC = () => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const handleAuthResponse = useAuthStore((s) => s.handleAuthResponse);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { terms: false },
  });

  const termsChecked = useWatch({ control, name: 'terms' });

  const handleGeneratePassword = () => {
    const password = generatePassword();
    setValue('password', password, { shouldValidate: true });
    setValue('confirmPassword', password, { shouldValidate: true });
    setShowPassword(true);
    setShowConfirm(true);
  };

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const res = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        confirm_password: data.confirmPassword,
      });
      handleAuthResponse(res);
      navigate(lp('/auth/verify-email'), { replace: true });
    } catch (err) {
      const { message } = getApiError(err);
      setApiError(message);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(locale, 'register.heading')}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t(locale, 'register.subtitle')}
        </p>
      </div>

      <ApiError message={apiError} />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="name">{t(locale, 'register.fullName')}</Label>
          <Input
            id="name"
            type="text"
            placeholder={t(locale, 'register.namePlaceholder')}
            autoComplete="name"
            {...register('name')}
          />
          <FieldErrorMessage error={errors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t(locale, 'register.email')}</Label>
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
            <Label htmlFor="password">{t(locale, 'register.password')}</Label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              tabIndex={-1}
            >
              <Dices className="size-3.5" />
              {t(locale, 'register.generate')}
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t(locale, 'register.minChars')}
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
          <Label htmlFor="confirm-password">{t(locale, 'register.confirmPassword')}</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              placeholder={t(locale, 'register.repeatPassword')}
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

        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="terms"
            checked={termsChecked === true}
            onCheckedChange={(checked) =>
              setValue('terms', checked === true, { shouldValidate: true })
            }
            className="mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer"
          >
            {t(locale, 'register.agreeTo')}{' '}
            <Link
              to={lp('/terms')}
              className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              {t(locale, 'register.terms')}
            </Link>
            ,{' '}
            <Link
              to={lp('/privacy')}
              className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              {t(locale, 'register.privacy')}
            </Link>{' '}
            {t(locale, 'register.and')}{' '}
            <Link
              to={lp('/personal-data-policy')}
              className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              {t(locale, 'register.dataPolicy')}
            </Link>
          </Label>
        </div>
        <FieldErrorMessage error={errors.terms} />

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? t(locale, 'register.submitting') : t(locale, 'register.submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {t(locale, 'register.hasAccount')}{' '}
        <Link
          to={lp('/auth/login')}
          className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors"
        >
          {t(locale, 'register.signIn')}
        </Link>
      </p>
    </AuthLayout>
  );
};
