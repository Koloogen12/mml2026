import type { FC } from 'react';
import { useState, useRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { COUNTRIES } from '@/shared/data/countries';
import { TIMEZONES } from '@/shared/data/timezones';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/auth-store';
import { usersApi, getApiError } from '@/shared/api';
import { ConfirmDialog } from '@/shared/ui';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  surname: z.string().max(50).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  company: z.string().max(100).optional(),
  website: z.url('Must be a valid URL').optional().or(z.literal('')),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const Component: FC = () => {
  const locale = useLocale();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [isEditMode, setIsEditMode] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      surname: '',
      phone: '',
      company: '',
      website: '',
      country: '',
      timezone: '',
    },
  });

  const formValues = useWatch({ control });

  // Load user data into form when available
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        surname: user.last_name || '',
        phone: user.phone || '',
        company: user.company || '',
        website: user.website || '',
        country: user.country || '',
        timezone: user.timezone || '',
      });
      if (user.avatar_url) {
        setAvatarPreview(user.avatar_url);
      }
    }
  }, [user, reset]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t(locale, 'profile.invalidFileType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t(locale, 'profile.fileTooLarge'));
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      const response = await usersApi.updateProfile({
        name: data.name,
        last_name: data.surname || undefined,
        phone: data.phone || undefined,
        company: data.company || undefined,
        website: data.website || undefined,
        country: data.country || undefined,
        timezone: data.timezone || undefined,
        avatar: avatarFile || undefined,
      });

      updateUser({
        name: response.name,
        last_name: response.last_name,
        phone: response.phone,
        company: response.company,
        website: response.website,
        country: response.country,
        timezone: response.timezone,
        avatar_url: response.avatar_url,
      });

      // Update avatar preview with new URL from server
      if (response.avatar_url) {
        setAvatarPreview(response.avatar_url);
      }

      toast.success(t(locale, 'profile.successToast'));
      setIsEditMode(false);
      setAvatarFile(null);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(`Error: ${apiError.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsEditMode(false);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(locale, 'profile.title')}
        description={t(locale, 'profile.description')}
        actions={
          isEditMode ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                {t(locale, 'profile.cancel')}
              </Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting ? t(locale, 'profile.saving') : t(locale, 'profile.saveChanges')}
              </Button>
            </div>
          ) : (
            <Button onClick={handleEdit}>{t(locale, 'profile.editProfile')}</Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Avatar Section */}
        <Card className="h-fit">
          <CardContent className="pt-6">
            {isEditMode ? (
              <div
                className={cn(
                  'relative flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-6 transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-border',
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Avatar className="size-40">
                  <AvatarImage
                    src={avatarPreview || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center">
                  <p className="mb-2 text-sm font-medium">
                    {t(locale, 'profile.dragDrop')}
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      handleFileSelect(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-4" />
                    {t(locale, 'profile.chooseFile')}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t(locale, 'profile.fileHint')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="group relative">
                  <Avatar className="size-40">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="text-2xl">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={handleEdit}
                  >
                    {t(locale, 'profile.change')}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(locale, 'profile.fileHint')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, 'profile.personalInfo')}</CardTitle>
              <CardDescription>{t(locale, 'profile.personalInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t(locale, 'profile.name')}</Label>
                {isEditMode ? (
                  <>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder={t(locale, 'profile.namePlaceholder')}
                    />
                    <FieldErrorMessage error={errors.name} />
                  </>
                ) : (
                  <p className="text-sm">
                    {formValues?.name || user?.name || t(locale, 'profile.notSet')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">{t(locale, 'profile.surname')}</Label>
                {isEditMode ? (
                  <>
                    <Input
                      id="surname"
                      {...register('surname')}
                      placeholder={t(locale, 'profile.surnamePlaceholder')}
                    />
                    <FieldErrorMessage error={errors.surname} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formValues?.surname || t(locale, 'profile.notSet')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t(locale, 'profile.email')}</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{user?.email || t(locale, 'profile.notSet')}</p>
                  <Badge
                    variant="secondary"
                    className="bg-green-500/10 text-green-700"
                  >
                    <Check className="mr-1 size-3" />
                    {t(locale, 'profile.verified')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, 'profile.contactInfo')}</CardTitle>
              <CardDescription>{t(locale, 'profile.contactInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t(locale, 'profile.phone')}</Label>
                {isEditMode ? (
                  <>
                    <Input
                      id="phone"
                      {...register('phone')}
                      placeholder="+1234567890"
                      type="tel"
                    />
                    <FieldErrorMessage error={errors.phone} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formValues?.phone || t(locale, 'profile.notSet')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">{t(locale, 'profile.company')}</Label>
                {isEditMode ? (
                  <>
                    <Input
                      id="company"
                      {...register('company')}
                      placeholder={t(locale, 'profile.companyPlaceholder')}
                    />
                    <FieldErrorMessage error={errors.company} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formValues?.company || t(locale, 'profile.notSet')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{t(locale, 'profile.website')}</Label>
                {isEditMode ? (
                  <>
                    <Input
                      id="website"
                      {...register('website')}
                      placeholder="https://example.com"
                      type="url"
                    />
                    <FieldErrorMessage error={errors.website} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formValues?.website || t(locale, 'profile.notSet')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, 'profile.preferences')}</CardTitle>
              <CardDescription>{t(locale, 'profile.preferencesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">{t(locale, 'profile.country')}</Label>
                {isEditMode ? (
                  <Select
                    value={formValues?.country}
                    onValueChange={(value) => setValue('country', value)}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder={t(locale, 'profile.countryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{t(locale, c.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formValues?.country || t(locale, 'profile.notSet')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">{t(locale, 'profile.timezone')}</Label>
                {isEditMode ? (
                  <Select
                    value={formValues?.timezone}
                    onValueChange={(value) => setValue('timezone', value)}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder={t(locale, 'profile.timezonePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formValues?.timezone || t(locale, 'profile.notSet')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/30 mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t(locale, 'profile.dangerZone')}
          </CardTitle>
          <CardDescription>{t(locale, 'profile.dangerZoneDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t(locale, 'profile.deleteAccount')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(locale, 'profile.deleteAccountDesc')}
              </p>
            </div>
            <ConfirmDialog
              title={t(locale, 'profile.deleteConfirmTitle')}
              description={t(locale, 'profile.deleteConfirmDesc')}
              confirmText={t(locale, 'profile.deleteConfirmBtn')}
              destructive
              requiresTyping
              requiredValue="DELETE"
              onConfirm={async () => {
                await usersApi.deleteAccount();
                clearAuth();
                navigate(`/${locale}/auth/login`, { replace: true });
              }}
            >
              <Button variant="destructive" size="sm">
                {t(locale, 'profile.deleteAccount')}
              </Button>
            </ConfirmDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
