import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  FileText,
  Download,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/shared/ui';
import { cn } from '@/lib/utils';
import {
  productsApi,
  type ImportValidateResponse,
  type ImportStatusResponse,
  type ParseHeadersResponse,
} from '@/shared/api';
import type { TranslationKey } from '@/shared/lib/i18n';

type Step = 1 | 2 | 3;
type ImportStatus = 'idle' | 'importing' | 'done';
type DuplicateMode = 'skip' | 'update';

const PRODUCT_FIELD_KEYS: Array<{ value: string; key: TranslationKey }> = [
  { value: 'ignore', key: 'products.fieldIgnore' },
  { value: 'name', key: 'products.fieldName' },
  { value: 'sku', key: 'products.fieldSku' },
  { value: 'brand', key: 'products.fieldBrand' },
  { value: 'category', key: 'products.fieldCategory' },
  { value: 'gender', key: 'products.fieldGender' },
  { value: 'price', key: 'products.fieldPrice' },
  { value: 'discount_price', key: 'products.fieldDiscountPrice' },
  { value: 'currency', key: 'products.fieldCurrency' },
  { value: 'image_url', key: 'products.fieldPhotoUrl' },
  { value: 'product_url', key: 'products.fieldProductUrl' },
  { value: 'season', key: 'products.fieldSeason' },
  { value: 'color', key: 'products.fieldColor' },
  { value: 'material', key: 'products.fieldMaterial' },
  { value: 'sizes', key: 'products.fieldSizes' },
  { value: 'description', key: 'products.fieldDescription' },
  { value: 'external_id', key: 'products.fieldExternalId' },
];

// Auto-mapping rules: CSV header (lowercase) → our field name
const AUTO_MAPPING: Record<string, string> = {
  name: 'name',
  title: 'name',
  название: 'name',
  наименование: 'name',
  sku: 'sku',
  артикул: 'sku',
  price: 'price',
  цена: 'price',
  brand: 'brand',
  бренд: 'brand',
  category: 'category',
  категория: 'category',
  gender: 'gender',
  пол: 'gender',
  description: 'description',
  описание: 'description',
  text: 'description',
  photo: 'image_url',
  image: 'image_url',
  image_url: 'image_url',
  image_url_1: 'image_url',
  фото: 'image_url',
  url: 'product_url',
  product_url: 'product_url',
  ссылка: 'product_url',
  color: 'color',
  colour: 'color',
  цвет: 'color',
  sizes: 'sizes',
  size: 'sizes',
  размеры: 'sizes',
  season: 'season',
  сезон: 'season',
  currency: 'currency',
  валюта: 'currency',
  material: 'material',
  материал: 'material',
  discount_price: 'discount_price',
  'price old': 'discount_price',
  external_id: 'external_id',
  'external id': 'external_id',
  externalid: 'external_id',
};

function buildAutoMapping(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    const key = h.toLowerCase().trim();
    result[h] = AUTO_MAPPING[key] ?? 'ignore';
  }
  return result;
}

// ─── Column reference docs ─────────────────────────────────────────────────────

interface ColDoc {
  col: string;
  required: boolean;
  descKey: TranslationKey;
  example: string;
}

const COLUMN_DOCS: ColDoc[] = [
  {
    col: 'name',
    required: true,
    descKey: 'products.col.name',
    example: 'Худи оверсайз',
  },
  {
    col: 'sku',
    required: false,
    descKey: 'products.col.sku',
    example: 'SKU-001',
  },
  {
    col: 'category',
    required: false,
    descKey: 'products.col.category',
    example: 'tops',
  },
  {
    col: 'gender',
    required: false,
    descKey: 'products.col.gender',
    example: 'female',
  },
  {
    col: 'price',
    required: false,
    descKey: 'products.col.price',
    example: '2990',
  },
  {
    col: 'discount_price',
    required: false,
    descKey: 'products.col.discount_price',
    example: '2490',
  },
  {
    col: 'currency',
    required: false,
    descKey: 'products.col.currency',
    example: 'RUB',
  },
  {
    col: 'product_url',
    required: false,
    descKey: 'products.col.product_url',
    example: 'https://shop.ru/item',
  },
  {
    col: 'season',
    required: false,
    descKey: 'products.col.season',
    example: 'spring,summer',
  },
  {
    col: 'color',
    required: false,
    descKey: 'products.col.color',
    example: 'Чёрный',
  },
  {
    col: 'material',
    required: false,
    descKey: 'products.col.material',
    example: 'Хлопок',
  },
  {
    col: 'brand',
    required: false,
    descKey: 'products.col.brand',
    example: 'Nike',
  },
  {
    col: 'sizes',
    required: false,
    descKey: 'products.col.sizes',
    example: 'S,M,L,XL',
  },
  {
    col: 'description',
    required: false,
    descKey: 'products.col.description',
    example: 'Удобное худи...',
  },
  {
    col: 'image_url_1..5',
    required: false,
    descKey: 'products.col.image_url',
    example: 'https://cdn.shop.ru/1.jpg',
  },
];

// ─── Import Guide ──────────────────────────────────────────────────────────────

const ImportGuide: FC<{ onDownloadTemplate: () => void }> = ({
  onDownloadTemplate,
}) => {
  const locale = useLocale();
  const [showColumns, setShowColumns] = useState(false);

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        {t(locale, 'products.importGuideTitle')}
      </h3>

      {/* Option 1 */}
      <div className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          1
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-0.5">
            {t(locale, 'products.importGuideOpt1Title')}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            {t(locale, 'products.importGuideOpt1Desc')}
          </p>
          <Button size="sm" variant="outline" onClick={onDownloadTemplate}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t(locale, 'products.downloadTemplate')}
          </Button>
        </div>
      </div>

      {/* Option 2 */}
      <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border">
        <div className="w-6 h-6 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          2
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-0.5">
            {t(locale, 'products.importGuideOpt2Title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(locale, 'products.importGuideOpt2Desc')}
          </p>
        </div>
      </div>

      {/* Column reference toggle */}
      <button
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        onClick={() => setShowColumns((v) => !v)}
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            showColumns && 'rotate-180',
          )}
        />
        {t(locale, 'products.importGuideColumnsTitle')}
      </button>

      {showColumns && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">
                  {t(locale, 'products.importGuideColHeader')}
                </TableHead>
                <TableHead className="w-20">
                  {t(locale, 'products.importGuideTypeHeader')}
                </TableHead>
                <TableHead>
                  {t(locale, 'products.importGuideDescHeader')}
                </TableHead>
                <TableHead className="w-36">
                  {t(locale, 'products.importGuideExampleHeader')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COLUMN_DOCS.map((doc) => (
                <TableRow key={doc.col}>
                  <TableCell>
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {doc.col}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'text-xs font-medium px-1.5 py-0.5 rounded-full',
                        doc.required
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {doc.required
                        ? t(locale, 'products.importGuideRequired')
                        : t(locale, 'products.importGuideOptional')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t(locale, doc.descKey)}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {doc.example}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};

// ─── Step Indicator ────────────────────────────────────────────────────────────

const StepIndicator: FC<{ current: Step }> = ({ current }) => {
  const locale = useLocale();
  const steps = [
    t(locale, 'products.stepUpload'),
    t(locale, 'products.stepMapColumns'),
    t(locale, 'products.stepPreview'),
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, idx) => {
        const num = (idx + 1) as Step;
        const isComplete = current > num;
        const isCurrent = current === num;

        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isComplete || isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : num}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  isCurrent
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-20 mx-3 mb-5 transition-colors',
                  current > num ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const Component: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const projectId = parseInt(id!);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Delimiter selection ('auto' = auto-detect)
  const [delimiter, setDelimiter] = useState<string>('auto');

  // Step 1 → 2: parse-headers result
  const [parsing, setParsing] = useState(false);
  const [headersResult, setHeadersResult] =
    useState<ParseHeadersResponse | null>(null);

  // Step 2: real column mapping (csvHeader → ourField)
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    {},
  );

  // Step 2 → 3: validation result
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] =
    useState<ImportValidateResponse | null>(null);

  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip');
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importResult, setImportResult] = useState<ImportStatusResponse | null>(
    null,
  );

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) setFile(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productsApi.getImportTemplate(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t(locale, 'products.downloadTemplateFailed'));
    }
  };

  // Step 1 → 2: call parse-headers, get real columns
  const handleNextStep1 = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const delimVal = delimiter === 'auto' ? undefined : delimiter;
      const result = await productsApi.parseHeaders(projectId, file, delimVal);
      setHeadersResult(result);
      // Store detected delimiter (use 'auto' as fallback)
      if (result.detected_delimiter) {
        setDelimiter(result.detected_delimiter);
      }
      // Build auto-mapping from real headers
      setColumnMappings(buildAutoMapping(result.headers));
      setStep(2);
    } catch {
      toast.error(t(locale, 'products.validateFailed'));
    } finally {
      setParsing(false);
    }
  };

  // Step 2 → 3: validate with real mapping
  const handleNextStep2 = async () => {
    if (!file || !headersResult) return;
    setValidating(true);
    try {
      const delimVal = delimiter === 'auto' ? undefined : delimiter;
      const result = await productsApi.validateImport(
        projectId,
        file,
        delimVal,
        columnMappings,
      );
      setValidateResult(result);
      setStep(3);
    } catch {
      toast.error(t(locale, 'products.validateFailed'));
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImportStatus('importing');
    setProgress(0);
    setImportedCount(0);
    const delimVal = delimiter === 'auto' ? undefined : delimiter;
    try {
      const result = await productsApi.executeImport(
        projectId,
        file,
        duplicateMode,
        delimVal,
        columnMappings,
      );
      const importId = result.import_id;
      setImportTotal(result.total);

      pollRef.current = setInterval(async () => {
        try {
          const status = await productsApi.getImportStatus(projectId, importId);
          setImportedCount(status.processed);
          setImportTotal(status.total);
          const pct =
            status.total > 0
              ? Math.round((status.processed / status.total) * 100)
              : 0;
          setProgress(pct);

          if (status.status === 'completed' || status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setImportResult(status);
            setImportStatus('done');
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          toast.error(t(locale, 'products.importStatusFailed'));
          setImportStatus('idle');
        }
      }, 2000);
    } catch {
      toast.error(t(locale, 'products.importStartFailed'));
      setImportStatus('idle');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validCount = validateResult?.valid_count ?? 0;
  const warnCount = validateResult?.warn_count ?? 0;
  const errorCount = validateResult?.error_count ?? 0;
  const importableCount = validCount + warnCount;

  const successImported = importResult
    ? importResult.total - importResult.errors.length
    : importableCount;
  const successErrors = importResult ? importResult.errors.length : errorCount;

  return (
    <>
      <PageHeader title={t(locale, 'products.importTitle')} />

      <div className="max-w-3xl">
        <StepIndicator current={step} />

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/40',
              )}
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-base font-medium mb-1">
                {t(locale, 'products.dropCsvHere')}
              </p>
              <p className="text-sm text-muted-foreground mb-5">
                {t(locale, 'products.maxFileSize')}
              </p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>{t(locale, 'products.chooseFile')}</span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Selected file */}
            {file && (
              <Card className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            )}

            {/* Delimiter selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground shrink-0">
                {t(locale, 'products.delimiter')}:
              </span>
              <Select value={delimiter} onValueChange={setDelimiter}>
                <SelectTrigger className="w-52">
                  <SelectValue
                    placeholder={t(locale, 'products.delimiterAuto')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    {t(locale, 'products.delimiterAuto')}
                  </SelectItem>
                  <SelectItem value=",">
                    {t(locale, 'products.delimiterComma')}
                  </SelectItem>
                  <SelectItem value=";">
                    {t(locale, 'products.delimiterSemicolon')}
                  </SelectItem>
                  <SelectItem value="\t">
                    {t(locale, 'products.delimiterTab')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Import guide */}
            <ImportGuide
              onDownloadTemplate={() => void handleDownloadTemplate()}
            />

            <div className="flex justify-end">
              <Button
                onClick={() => void handleNextStep1()}
                disabled={!file || parsing}
              >
                {parsing
                  ? t(locale, 'products.parsingFile')
                  : t(locale, 'products.next')}
                {!parsing && <ChevronRight className="ml-1.5 h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Column mapping (real data from parse-headers) ── */}
        {step === 2 && headersResult && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
              <span>{t(locale, 'products.columnsDetectedPrefix')}</span>
              <span className="font-medium text-foreground">
                {headersResult.headers.length}{' '}
                {t(locale, 'products.columnsDetected')}
              </span>
              <span>{t(locale, 'products.columnsDetectedSuffix')}</span>
              {headersResult.detected_delimiter && (
                <span className="ml-auto">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {headersResult.detected_delimiter === '\t'
                      ? 'Tab'
                      : headersResult.detected_delimiter === ','
                        ? 'Comma'
                        : headersResult.detected_delimiter === ';'
                          ? 'Semicolon'
                          : headersResult.detected_delimiter}
                  </code>
                </span>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, 'products.csvColumn')}</TableHead>
                    <TableHead>{t(locale, 'products.sampleValue')}</TableHead>
                    <TableHead className="w-8 text-center text-muted-foreground">
                      →
                    </TableHead>
                    <TableHead className="w-52">
                      {t(locale, 'products.productField')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headersResult.headers.map((header, colIdx) => {
                    // Pick sample value from first non-empty row
                    const sample =
                      headersResult.sample_rows.find((row) =>
                        row[colIdx]?.trim(),
                      )?.[colIdx] ?? '';
                    return (
                      <TableRow key={header}>
                        <TableCell>
                          <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                            {header}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <span className="truncate block">
                            {sample || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          →
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMappings[header] ?? 'ignore'}
                            onValueChange={(val) =>
                              setColumnMappings((prev) => ({
                                ...prev,
                                [header]: val,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRODUCT_FIELD_KEYS.map((field) => (
                                <SelectItem
                                  key={field.value}
                                  value={field.value}
                                >
                                  {field.value === 'ignore'
                                    ? t(locale, field.key)
                                    : field.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                {t(locale, 'products.back')}
              </Button>
              <Button
                onClick={() => void handleNextStep2()}
                disabled={validating}
              >
                {validating
                  ? t(locale, 'products.validating')
                  : t(locale, 'products.preview')}
                {!validating && <ChevronRight className="ml-1.5 h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
        {/* ── Step 3: Preview & Import ── */}
        {step === 3 && (
          <div className="space-y-5">
            {importStatus === 'done' ? (
              /* Success state */
              <Card className="p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {t(locale, 'products.importComplete')}
                </h3>
                <p className="text-muted-foreground mb-1">
                  <span className="text-foreground font-semibold">
                    {successImported} {t(locale, 'products.productsImported')}
                  </span>{' '}
                  {t(locale, 'products.importedSuccessfully')}
                </p>
                {successErrors > 0 && (
                  <p className="text-sm text-muted-foreground mb-6">
                    <span className="text-amber-600 font-medium">
                      {successErrors} {t(locale, 'products.rowsNotImported')}
                    </span>{' '}
                    {t(locale, 'products.couldNotImport')}
                  </p>
                )}
                <div className="flex gap-3 justify-center mt-6">
                  {importResult && importResult.errors.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const content = importResult.errors.join('\n');
                        const blob = new Blob([content], {
                          type: 'text/plain',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'import-errors.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      {t(locale, 'products.downloadErrorLog')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => navigate(lp(`/projects/${id}/products`))}
                  >
                    {t(locale, 'products.viewProducts')}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ) : importStatus === 'importing' ? (
              /* Progress state */
              <Card className="p-10 text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-0.5">
                    {t(locale, 'products.importingProducts')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {importedCount} / {importTotal || '?'}{' '}
                    {t(locale, 'products.processed')}
                  </p>
                </div>
                <div className="max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(locale, 'products.downloadingPhotos')}
                </p>
              </Card>
            ) : (
              <>
                {/* Preview table */}
                <div>
                  <h3 className="font-semibold mb-3">
                    {t(locale, 'products.previewFirst')}{' '}
                    {Math.min(5, validateResult?.preview?.length ?? 0)}{' '}
                    {t(locale, 'products.previewRows')}
                  </h3>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t(locale, 'products.headerName')}
                          </TableHead>
                          <TableHead>
                            {t(locale, 'products.headerPhoto2')}
                          </TableHead>
                          <TableHead>
                            {t(locale, 'products.headerCategory')}
                          </TableHead>
                          <TableHead>
                            {t(locale, 'products.headerGender')}
                          </TableHead>
                          <TableHead>
                            {t(locale, 'products.headerPrice')}
                          </TableHead>
                          <TableHead>
                            {t(locale, 'products.headerSku')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validateResult?.preview?.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {row.name}
                            </TableCell>
                            <TableCell>
                              {row.image_urls.length > 0 ? (
                                <span className="text-green-600 text-sm font-medium">
                                  ✓ OK
                                </span>
                              ) : (
                                <span className="text-amber-600 text-sm font-medium flex items-center gap-1">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {t(locale, 'products.noImage')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.category ?? '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.gender ?? '—'}
                            </TableCell>
                            <TableCell>
                              {row.price != null ? `${row.price} ₽` : '—'}
                            </TableCell>
                            <TableCell>
                              {row.sku ? (
                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {row.sku}
                                </code>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Validation summary */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3">
                    {t(locale, 'products.validationSummary')}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-green-700">
                        {validCount} {t(locale, 'products.rowsValid')}
                      </span>
                    </div>
                    {warnCount > 0 && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                        </div>
                        <span className="text-sm font-medium text-amber-700">
                          {warnCount} {t(locale, 'products.rowsWarnings')}
                        </span>
                      </div>
                    )}
                    {errorCount > 0 && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <X className="h-3 w-3 text-red-600" />
                        </div>
                        <span className="text-sm font-medium text-red-700">
                          {errorCount} {t(locale, 'products.rowsErrors')}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Duplicate handling */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {t(locale, 'products.duplicateProducts')}
                  </p>
                  <div className="space-y-2">
                    {(['skip', 'update'] as const).map((option) => (
                      <label
                        key={option}
                        className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <div
                          className={cn(
                            'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                            duplicateMode === option
                              ? 'border-primary'
                              : 'border-muted-foreground/40',
                          )}
                          onClick={() => setDuplicateMode(option)}
                        >
                          {duplicateMode === option && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <input
                          type="radio"
                          className="sr-only"
                          checked={duplicateMode === option}
                          onChange={() => setDuplicateMode(option)}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {option === 'skip'
                              ? t(locale, 'products.skipDuplicates')
                              : t(locale, 'products.updateExisting')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {option === 'skip'
                              ? t(locale, 'products.skipDuplicatesDesc')
                              : t(locale, 'products.updateExistingDesc')}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => void handleImport()}
                  disabled={importableCount === 0}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t(locale, 'products.importCount')} {importableCount}{' '}
                  {t(locale, 'products.importProducts')}
                </Button>

                <div className="flex justify-start">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    {t(locale, 'products.back')}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};
