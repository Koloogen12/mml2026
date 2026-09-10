import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  projectsApi,
  getApiError,
  projectKeys,
  useProject,
  useReference,
} from '@/shared/api';
import { toast } from 'sonner';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';

const generalSchema = z.object({
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  siteUrl: z.url('Please enter a valid URL'),
  category: z.string().optional(),
  targetAudience: z.array(z.string()).min(1),
  description: z.string().max(500).optional(),
  logo: z.instanceof(File).optional(),
});

type GeneralFormData = z.infer<typeof generalSchema>;

const AudienceChipSelector: FC<{
  value: string[];
  onChange: (value: string[]) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`
              px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
              ${
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-muted hover:border-primary/50'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

const LogoUpload: FC<{
  currentLogoUrl?: string;
  value?: File;
  onChange: (file: File | undefined) => void;
  changeLabel: string;
  uploadLabel: string;
  hintLabel: string;
}> = ({ currentLogoUrl, onChange, changeLabel, uploadLabel, hintLabel }) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    setPreview(null);
  };

  const displayUrl = preview || currentLogoUrl;

  return (
    <div className="flex items-start gap-4">
      {displayUrl && (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted border">
          <img
            src={displayUrl}
            alt="Logo"
            className="w-full h-full object-cover"
          />
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      <div className="flex-1">
        <Label
          htmlFor="logo-upload"
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm">
            {displayUrl ? changeLabel : uploadLabel}
          </span>
        </Label>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {hintLabel}
        </p>
      </div>
    </div>
  );
};

interface Props {
  projectId: number;
}

export const SettingsGeneralTab: FC<Props> = ({ projectId }) => {
  const { data: project } = useProject(projectId);
  const { data: reference } = useReference();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
  } = useForm<GeneralFormData>({ resolver: zodResolver(generalSchema) });

  const targetAudience = useWatch({ control, name: 'targetAudience' }) || [];
  const category = useWatch({ control, name: 'category' });
  const logo = useWatch({ control, name: 'logo' });

  useEffect(() => {
    if (!project) return;
    reset({
      projectName: project.name,
      siteUrl: project.site_url,
      category: project.category ?? undefined,
      targetAudience: project.target_audience,
      description: project.description || '',
    });
  }, [project, reset]);

  const onSubmit = async (data: GeneralFormData) => {
    if (!project) return;
    try {
      setIsSubmitting(true);
      await projectsApi.update(project.id, {
        name: data.projectName,
        site_url: data.siteUrl,
        category: data.category,
        target_audience: data.targetAudience,
        description: data.description,
        logo: data.logo,
      });
      await queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
      toast.success(t(locale, 'settingsGeneral.successToast'));
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="projectName">{t(locale, 'settingsGeneral.projectName')}</Label>
          <Input
            id="projectName"
            {...register('projectName')}
            className="mt-2"
            disabled={isSubmitting}
          />
          {errors.projectName && (
            <p className="text-sm text-destructive mt-1">
              {errors.projectName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="siteUrl">{t(locale, 'settingsGeneral.siteUrl')}</Label>
          <Input
            id="siteUrl"
            {...register('siteUrl')}
            type="url"
            className="mt-2"
            disabled={isSubmitting}
          />
          {errors.siteUrl && (
            <p className="text-sm text-destructive mt-1">
              {errors.siteUrl.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="category">{t(locale, 'settingsGeneral.category')}</Label>
          <Select
            value={category}
            onValueChange={(value) => setValue('category', value)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={t(locale, 'settingsGeneral.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {(reference?.categories ?? []).map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t(locale, 'settingsGeneral.targetAudience')}</Label>
          <div className="mt-2">
            <AudienceChipSelector
              value={targetAudience}
              onChange={(value) => setValue('targetAudience', value)}
              options={reference?.genders ?? []}
            />
          </div>
          {errors.targetAudience && (
            <p className="text-sm text-destructive mt-1">
              {errors.targetAudience.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">{t(locale, 'settingsGeneral.descriptionOptional')}</Label>
          <Textarea
            id="description"
            {...register('description')}
            className="mt-2"
            rows={3}
            disabled={isSubmitting}
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <Label>{t(locale, 'settingsGeneral.logoOptional')}</Label>
          <div className="mt-2">
            <LogoUpload
              currentLogoUrl={project.logo_url}
              value={logo}
              onChange={(file) => setValue('logo', file)}
              changeLabel={t(locale, 'settingsGeneral.changeLogo')}
              uploadLabel={t(locale, 'settingsGeneral.uploadLogo')}
              hintLabel={t(locale, 'settingsGeneral.logoHint')}
            />
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t(locale, 'settingsGeneral.saving')}
              </>
            ) : (
              t(locale, 'settingsGeneral.saveChanges')
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
