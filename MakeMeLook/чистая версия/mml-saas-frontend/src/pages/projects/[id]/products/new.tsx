import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale, useLocalePath } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/shared/ui';
import { cn } from '@/lib/utils';
import {
  productsApi,
  useProduct,
  useReference,
  type CreateProductRequest,
} from '@/shared/api';
import {
  ProductPhotoUploader,
  type PhotoUploadSnapshot,
} from './ProductPhotoUploader';

export const Component: FC = () => {
  const navigate = useNavigate();
  const { id, productId } = useParams<{ id: string; productId?: string }>();
  const locale = useLocale();
  const lp = useLocalePath();
  const projectId = parseInt(id!);
  const isEditing = Boolean(productId);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [gender, setGender] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [discountPrice, setDiscountPrice] = useState('');
  const [productUrl, setProductUrl] = useState(''); 
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [material, setMaterial] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  // Photo uploader snapshot (isUploading + ordered IDs)
  const [photoSnapshot, setPhotoSnapshot] = useState<PhotoUploadSnapshot>({
    isUploading: false,
    photoIds: [],
  });

  const [saving, setSaving] = useState(false);

  // Load product for edit
  const { data: productData } = useProduct(
    projectId,
    parseInt(productId ?? '0'),
    isEditing && Boolean(productId),
  );
  const { data: reference } = useReference();

  useEffect(() => {
    if (!productData) return;
    setName(productData.name);
    setCategory(productData.category ?? '');
    setSubcategory(productData.subcategory ?? '');
    setGender(productData.gender ?? '');
    setSku(productData.sku ?? '');
    setPrice(productData.price !== undefined ? String(productData.price) : '');
    setCurrency(productData.currency ?? 'RUB');
    setDiscountPrice(
      productData.discount_price !== undefined
        ? String(productData.discount_price)
        : '',
    );
    setProductUrl(productData.product_url ?? '');
    setSelectedSeasons(productData.season ?? []);
    setSelectedColor(productData.color ?? '');
    setMaterial(productData.material ?? '');
    setBrand(productData.brand ?? '');
    setSelectedSizes(productData.sizes ?? []);
    setDescription(productData.description ?? '');
  }, [productData]);

  const handlePhotoChange = useCallback((snapshot: PhotoUploadSnapshot) => {
    setPhotoSnapshot(snapshot);
  }, []);

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season)
        ? prev.filter((s) => s !== season)
        : [...prev, season],
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const canSave =
    name.trim() && category && gender && !saving && !photoSnapshot.isUploading;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const data: CreateProductRequest = {
        name: name.trim(),
        category: category || undefined,
        subcategory: subcategory.trim() || undefined,
        gender: gender || undefined,
        sku: sku.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        currency: currency || undefined,
        discount_price: discountPrice ? parseFloat(discountPrice) : undefined,
        product_url: productUrl.trim() || undefined,
        season: selectedSeasons.length > 0 ? selectedSeasons : undefined,
        color: selectedColor || undefined,
        material: material.trim() || undefined,
        brand: brand.trim() || undefined,
        sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
        description: description.trim() || undefined,
        photo_ids: photoSnapshot.photoIds,
      };

      if (isEditing && productId) {
        await productsApi.update(projectId, parseInt(productId), data);
      } else {
        await productsApi.create(projectId, data);
      }

      toast.success(isEditing ? t(locale, 'products.productUpdated') : t(locale, 'products.productCreated'));
      navigate(lp(`/projects/${id}/products`));
    } catch {
      toast.error(t(locale, 'products.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isEditing ? t(locale, 'products.editProduct') : t(locale, 'products.newProduct')}
        description={
          isEditing
            ? t(locale, 'products.editDescription')
            : t(locale, 'products.newDescription')
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Left column: photos */}
        <ProductPhotoUploader
          // Remount when switching between new / edit so initial slots reset.
          key={productData?.id ?? 'new'}
          projectId={projectId}
          initialPhotos={productData?.photos}
          onChange={handlePhotoChange}
        />

        {/* Right column: fields */}
        <div className="space-y-6">
          {/* Required fields */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t(locale, 'products.requiredInfo')}</h3>

            <div className="space-y-1.5">
              <Label htmlFor="product-name">{t(locale, 'products.productName')}</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(locale, 'products.productNamePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t(locale, 'products.category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(locale, 'products.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(reference?.product_categories ?? []).map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t(locale, 'products.subcategory')}</Label>
                <Input
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder={t(locale, 'products.subcategoryPlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t(locale, 'products.gender')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(locale, 'products.selectGender')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(reference?.genders ?? []).map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Optional fields */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t(locale, 'products.optionalDetails')}</h3>

            {/* SKU + Price + Currency */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="sku">{t(locale, 'products.sku')}</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder={t(locale, 'products.skuPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">{t(locale, 'products.price')}</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t(locale, 'products.currency')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(reference?.currencies ?? []).map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Discount + URL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="discount-price">{t(locale, 'products.discountPrice')}</Label>
                <Input
                  id="discount-price"
                  type="number"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-url">{t(locale, 'products.productUrl')}</Label>
                <Input
                  id="product-url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder={t(locale, 'products.productUrlPlaceholder')}
                />
              </div>
            </div>

            {/* Season */}
            <div className="space-y-1.5">
              <Label>{t(locale, 'products.season')}</Label>
              <div className="flex flex-wrap gap-2">
                {(reference?.seasons ?? []).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSeason(s.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm border transition-colors',
                      selectedSeasons.includes(s.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:border-primary/50 text-foreground',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>{t(locale, 'products.color')}</Label>
              <Input
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                placeholder={t(locale, 'products.colorPlaceholder')}
                list="color-suggestions"
              />
              <datalist id="color-suggestions">
                {(reference?.colors ?? []).map((color) => (
                  <option key={color.value} value={color.value} />
                ))}
              </datalist>
            </div>

            {/* Material + Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="material">{t(locale, 'products.material')}</Label>
                <Input
                  id="material"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder={t(locale, 'products.materialPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand">{t(locale, 'products.brand')}</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder={t(locale, 'products.brandPlaceholder')}
                />
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-1.5">
              <Label>{t(locale, 'products.availableSizes')}</Label>
              <div className="flex gap-2 flex-wrap">
                {(reference?.sizes ?? []).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cn(
                      'min-w-[44px] px-3 py-1 rounded-md text-sm border font-medium transition-colors',
                      selectedSizes.includes(size)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:border-primary/50 text-foreground',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">{t(locale, 'products.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(locale, 'products.descriptionPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          {/* Action bar */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => navigate(lp(`/projects/${id}/products`))}
              disabled={saving}
            >
              {t(locale, 'products.cancelBtn')}
            </Button>
            <Button disabled={!canSave} onClick={() => void handleSave()}>
              {photoSnapshot.isUploading
                ? t(locale, 'products.uploadingPhotos')
                : saving
                  ? t(locale, 'products.saving')
                  : isEditing
                    ? t(locale, 'products.saveChanges')
                    : t(locale, 'products.saveProduct')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
