import type { FC } from 'react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { PageHeader } from '@/shared/ui/page-header';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FieldErrorMessage } from '@/components/ui/field-error';
import { Eye, EyeOff, Shield, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePassword } from '@/shared/lib/generate-password';
import { usersApi, getApiError } from '@/shared/api';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

const getPasswordStrength = (
  password: string,
): { strength: 'weak' | 'medium' | 'strong'; label: string; color: string } => {
  if (!password) {
    return { strength: 'weak', label: '', color: '' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return {
      strength: 'weak',
      label: 'security.weak',
      color: 'bg-red-500',
    };
  } else if (score <= 4) {
    return {
      strength: 'medium',
      label: 'security.medium',
      color: 'bg-yellow-500',
    };
  } else {
    return {
      strength: 'strong',
      label: 'security.strong',
      color: 'bg-green-500',
    };
  }
};

export const Component: FC = () => {
  const locale = useLocale();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = useWatch({ control, name: 'newPassword' });
  const passwordStrength = getPasswordStrength(newPassword || '');

  const handleGeneratePassword = () => {
    const password = generatePassword();
    setValue('newPassword', password, { shouldValidate: true });
    setValue('confirmPassword', password, { shouldValidate: true });
    setShowNew(true);
    setShowConfirm(true);
  };

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    try {
      await usersApi.changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
        confirm_password: data.confirmPassword,
      });

      toast.success(t(locale, 'security.passwordChanged'));
      reset();
    } catch (error) {
      const apiError = getApiError(error);

      if (apiError.code === 'invalid_credentials') {
        toast.error(t(locale, 'security.incorrectPassword'));
      } else if (apiError.code === 'weak_password') {
        toast.error(t(locale, 'security.weakPasswordError'));
      } else {
        toast.error(`Error: ${apiError.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(locale, 'security.title')}
        description={t(locale, 'security.description')}
      />

      <div className="max-w-2xl space-y-6">
        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t(locale, 'security.changePassword')}</CardTitle>
            <CardDescription>
              {t(locale, 'security.changePasswordDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="max-w-md space-y-4"
            >
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">{t(locale, 'security.currentPassword')}</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('currentPassword')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <FieldErrorMessage error={errors.currentPassword} />
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-password">{t(locale, 'security.newPassword')}</Label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    tabIndex={-1}
                  >
                    <Dices className="size-3.5" />
                    {t(locale, 'security.generate')}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('newPassword')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <FieldErrorMessage error={errors.newPassword} />

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <div
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          passwordStrength.strength === 'weak'
                            ? passwordStrength.color
                            : passwordStrength.strength === 'medium' ||
                                passwordStrength.strength === 'strong'
                              ? passwordStrength.color
                              : 'bg-muted',
                        )}
                      />
                      <div
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          passwordStrength.strength === 'medium' ||
                            passwordStrength.strength === 'strong'
                            ? passwordStrength.color
                            : 'bg-muted',
                        )}
                      />
                      <div
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          passwordStrength.strength === 'strong'
                            ? passwordStrength.color
                            : 'bg-muted',
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, 'security.passwordStrength')}{' '}
                      <span
                        className={cn(
                          'font-medium',
                          passwordStrength.strength === 'weak' &&
                            'text-red-500',
                          passwordStrength.strength === 'medium' &&
                            'text-yellow-500',
                          passwordStrength.strength === 'strong' &&
                            'text-green-500',
                        )}
                      >
                        {t(locale, passwordStrength.label as any)}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t(locale, 'security.confirmNewPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t(locale, 'security.changingPassword') : t(locale, 'security.changePasswordBtn')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Sessions Card (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>{t(locale, 'security.activeSessions')}</CardTitle>
            <CardDescription>
              {t(locale, 'security.activeSessionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="mb-4 size-12 text-muted-foreground/40" />
              <h3 className="mb-2 font-semibold">{t(locale, 'security.comingSoon')}</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                {t(locale, 'security.comingSoonDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
