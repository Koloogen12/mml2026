import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Check,
  ChevronLeft,
  Upload,
  X,
  TrendingUp,
  MessageSquare,
  Presentation,
  Lock,
  Edit2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { projectsApi, getApiError, useReference } from '@/shared/api';

// Validation schemas
const step1Schema = z.object({
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  siteUrl: z.url('Please enter a valid URL'),
  category: z.string().min(1, 'Please select a category'),
  targetAudience: z
    .array(z.string())
    .min(1, 'Please select at least one audience'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  logo: z.instanceof(File).optional(),
});

type Step1Data = z.infer<typeof step1Schema>;

// Step 2 doesn't require validation - just solution selection
type Step2Data = {
  tryOnWidget: boolean;
};

interface WizardData {
  step1: Partial<Step1Data>;
  step2: Partial<Step2Data>;
}

// Stepper Component
const Stepper: FC<{
  steps: { title: string; description: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full py-8">
      <div className="flex items-start justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={index} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => isCompleted && onStepClick?.(index)}
                  disabled={!isCompleted}
                  className={`
                    relative z-10 flex items-center justify-center
                    w-10 h-10 rounded-full border-2 transition-all
                    ${
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground cursor-pointer hover:scale-110'
                        : isActive
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background border-muted-foreground/30 text-muted-foreground'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-3 text-center">
                  <div
                    className={`
                      text-sm font-medium transition-colors
                      ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                    `}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    absolute top-5 left-1/2 w-full h-0.5 transition-all
                    ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'}
                  `}
                  style={{ transform: 'translateY(-50%)' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Multi-select Chip Component
const AudienceChipSelector: FC<{
  value: string[];
  onChange: (value: string[]) => void;
  options: { value: string; label: string }[];
  error?: string;
}> = ({ value, onChange, options, error }) => {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div>
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
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
};

// Logo Upload Component
const LogoUpload: FC<{
  value?: File;
  onChange: (file: File | undefined) => void;
}> = ({ onChange }) => {
  const locale = useLocale();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    setPreview(null);
  };

  return (
    <div>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Logo preview"
            className="w-24 h-24 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:scale-110 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground">{t(locale, 'wizard.uploadLogo')}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
};

// Solution Card Component
const SolutionCard: FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
  selected?: boolean;
  onSelect?: () => void;
}> = ({ icon, title, description, available, selected, onSelect }) => {
  const locale = useLocale();
  return (
    <Card
      className={`
        relative p-6 transition-all h-full flex flex-col cursor-pointer
        ${
          selected
            ? 'border-primary bg-primary/5'
            : available
              ? 'hover:border-primary/50'
              : 'opacity-60 cursor-not-allowed'
        }
      `}
      onClick={() => available && onSelect?.()}
    >
      {!available && (
        <div className="absolute top-3 right-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-background rounded-full p-1.5 border shadow-sm cursor-help">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t(locale, 'wizard.comingSoon')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="flex flex-col items-center text-center h-full">
        {/* Icon */}
        <div
          className={`
            w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-colors
            ${
              selected
                ? 'bg-primary text-primary-foreground'
                : available
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
            }
          `}
        >
          {icon}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base mb-2">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  );
};

// Main Component
export const Component: FC = () => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const { data: reference } = useReference();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    step1: {},
    step2: { tryOnWidget: true },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    formState: { errors },
    control,
    getValues,
    setValue,
    trigger,
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      targetAudience: [],
      ...wizardData.step1,
    },
    mode: 'onBlur',
  });

  const steps = [
    { title: t(locale, 'wizard.stepSiteInfo'), description: t(locale, 'wizard.stepSiteInfoDesc') },
    { title: t(locale, 'wizard.stepSolutions'), description: t(locale, 'wizard.stepSolutionsDesc') },
    { title: t(locale, 'wizard.stepConfirm'), description: t(locale, 'wizard.stepConfirmDesc') },
  ];

  const handleNext = async () => {
    if (currentStep === 0) {
      const isValid = await trigger();
      if (isValid) {
        const data = getValues();
        setWizardData((prev) => ({ ...prev, step1: data }));
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleCreateProject = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const step1 = wizardData.step1;

      const project = await projectsApi.create({
        name: step1.projectName || '',
        site_url: step1.siteUrl || '',
        category: step1.category,
        target_audience: step1.targetAudience || [],
        description: step1.description,
        logo: step1.logo,
      });

      // Navigate to the created project
      navigate(lp(`/projects/${project.id}`));
    } catch (err) {
      const apiError = getApiError(err);
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const targetAudience = useWatch({ control, name: 'targetAudience' }) || [];
  const category = useWatch({ control, name: 'category' });
  const logo = useWatch({ control, name: 'logo' });

  const logoPreviewUrl = useMemo(() => {
    if (wizardData.step1.logo) {
      return URL.createObjectURL(wizardData.step1.logo);
    }
    return null;
  }, [wizardData.step1.logo]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Stepper */}
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />

          {/* Content Area */}
          <div className="mt-8 mb-8">
            {/* Step 1: Site Information */}
            {currentStep === 0 && (
              <Card className="p-8">
                <h2 className="text-2xl font-semibold mb-6">
                  {t(locale, 'wizard.siteInfoHeading')}
                </h2>

                <div className="space-y-6">
                  {/* Project Name */}
                  <div>
                    <Label htmlFor="projectName">
                      {t(locale, 'wizard.projectName')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="projectName"
                      {...register('projectName')}
                      placeholder={t(locale, 'wizard.projectNamePlaceholder')}
                      className="mt-2"
                    />
                    {errors.projectName && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.projectName.message}
                      </p>
                    )}
                  </div>

                  {/* Site URL */}
                  <div>
                    <Label htmlFor="siteUrl">
                      {t(locale, 'wizard.siteUrl')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="siteUrl"
                      {...register('siteUrl')}
                      type="url"
                      placeholder={t(locale, 'wizard.siteUrlPlaceholder')}
                      className="mt-2"
                    />
                    {errors.siteUrl && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.siteUrl.message}
                      </p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <Label htmlFor="category">
                      {t(locale, 'wizard.category')} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={category}
                      onValueChange={(value) =>
                        setValue('category', value, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={t(locale, 'wizard.categoryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(reference?.categories ?? []).map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  {/* Target Audience */}
                  <div>
                    <Label>
                      {t(locale, 'wizard.targetAudience')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t(locale, 'wizard.selectAllThatApply')}
                    </p>
                    <AudienceChipSelector
                      value={targetAudience}
                      onChange={(value) =>
                        setValue('targetAudience', value, {
                          shouldValidate: true,
                        })
                      }
                      options={reference?.genders ?? []}
                      error={errors.targetAudience?.message}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">{t(locale, 'wizard.descriptionOptional')}</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder={t(locale, 'wizard.descriptionPlaceholder')}
                      className="mt-2"
                      rows={4}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <Label>{t(locale, 'wizard.logoOptional')}</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t(locale, 'wizard.logoHelp')}
                    </p>
                    <LogoUpload
                      value={logo}
                      onChange={(file) => setValue('logo', file)}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Step 2: Choose Solutions */}
            {currentStep === 1 && (
              <Card className="p-8">
                <h2 className="text-2xl font-semibold mb-2">
                  {t(locale, 'wizard.chooseSolutionsHeading')}
                </h2>
                <p className="text-muted-foreground mb-8">
                  {t(locale, 'wizard.chooseSolutionsSubtext')}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <SolutionCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    title={t(locale, 'wizard.tryOnWidget')}
                    description={t(locale, 'wizard.tryOnWidgetDesc')}
                    available={true}
                    selected={wizardData.step2.tryOnWidget}
                    onSelect={() =>
                      setWizardData((prev) => ({
                        ...prev,
                        step2: {
                          ...prev.step2,
                          tryOnWidget: !prev.step2.tryOnWidget,
                        },
                      }))
                    }
                  />

                  <SolutionCard
                    icon={<MessageSquare className="w-6 h-6" />}
                    title={t(locale, 'wizard.aiStylist')}
                    description={t(locale, 'wizard.aiStylistDesc')}
                    available={false}
                  />

                  <SolutionCard
                    icon={<Presentation className="w-6 h-6" />}
                    title={t(locale, 'wizard.showRoomPages')}
                    description={t(locale, 'wizard.showRoomPagesDesc')}
                    available={false}
                  />
                </div>
              </Card>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 2 && (
              <Card className="p-8">
                <h2 className="text-2xl font-semibold mb-6">
                  {t(locale, 'wizard.confirmHeading')}
                </h2>

                {error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-8">
                  {/* Project Details */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{t(locale, 'wizard.projectDetails')}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(0)}
                        className="cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        {t(locale, 'wizard.edit')}
                      </Button>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {t(locale, 'wizard.projectName')}
                          </div>
                          <div className="font-medium">
                            {wizardData.step1.projectName}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {t(locale, 'wizard.siteUrl')}
                          </div>
                          <div className="font-medium">
                            {wizardData.step1.siteUrl}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {t(locale, 'wizard.category')}
                          </div>
                          <div className="font-medium capitalize">
                            {wizardData.step1.category?.replace('-', ' ')}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {t(locale, 'wizard.targetAudience')}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {wizardData.step1.targetAudience?.map(
                              (audience) => (
                                <Badge key={audience} variant="secondary">
                                  {audience.charAt(0).toUpperCase() +
                                    audience.slice(1)}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      </div>

                      {wizardData.step1.description && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {t(locale, 'wizard.description')}
                          </div>
                          <div className="text-sm">
                            {wizardData.step1.description}
                          </div>
                        </div>
                      )}

                      {wizardData.step1.logo && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {t(locale, 'wizard.logo')}
                          </div>
                          <img
                            src={logoPreviewUrl!}
                            alt="Logo"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Solutions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {t(locale, 'wizard.selectedSolutions')}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                        className="cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        {t(locale, 'wizard.edit')}
                      </Button>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-6">
                      {wizardData.step2.tryOnWidget ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">{t(locale, 'wizard.tryOnWidget')}</div>
                            <div className="text-sm text-muted-foreground">
                              {t(locale, 'wizard.fittingRoomEnabled')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          {t(locale, 'wizard.noSolutions')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t(locale, 'wizard.back')}
            </Button>

            {currentStep < 2 ? (
              <Button
                onClick={handleNext}
                disabled={currentStep === 1 && !wizardData.step2.tryOnWidget}
                className="cursor-pointer"
              >
                {t(locale, 'wizard.next')}
                <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateProject}
                disabled={isLoading}
                className="cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t(locale, 'wizard.creating')}
                  </>
                ) : (
                  t(locale, 'wizard.createProject')
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
