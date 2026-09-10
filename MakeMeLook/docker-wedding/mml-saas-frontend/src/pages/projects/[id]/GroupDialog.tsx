import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  productGroupsApi,
  useAllProducts,
  useGroupProducts,
  type ProductGroupResponse,
} from '@/shared/api';

export interface GroupDialogProps {
  open: boolean;
  projectId: number;
  group: ProductGroupResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const GroupDialog: FC<GroupDialogProps> = ({
  open,
  projectId,
  group,
  onClose,
  onSuccess,
}) => {
  const locale = useLocale();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: allProductsData } = useAllProducts(projectId, open);
  const allProducts = allProductsData?.products ?? [];

  const { data: groupProductsData } = useGroupProducts(
    projectId,
    group?.id,
    open && Boolean(group),
  );

  // Reset dialog state when opened
  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setProductSearch('');
    setSaving(false);
    setSelectedIds([]);
  }, [open, group]);

  // Populate selection when group product data loads
  useEffect(() => {
    if (!open || !group || !groupProductsData) return;
    setSelectedIds(groupProductsData.products.map((p) => p.id));
  }, [open, group, groupProductsData]);

  const filtered = allProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const toggleProduct = (pid: number) => {
    setSelectedIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (group) {
        await productGroupsApi.update(projectId, group.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: group.is_active,
          product_ids: selectedIds,
        });
      } else {
        await productGroupsApi.create(projectId, {
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: true,
          product_ids: selectedIds,
        });
      }

      toast.success(group ? t(locale, 'groups.groupUpdated') : t(locale, 'groups.groupCreated'));
      onSuccess();
      onClose();
    } catch {
      toast.error(t(locale, 'groups.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {group ? t(locale, 'groups.editGroup') : t(locale, 'groups.createProductGroup')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{t(locale, 'groups.groupName')}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(locale, 'groups.groupNamePlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-desc">{t(locale, 'groups.descriptionOptional')}</Label>
            <Textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(locale, 'groups.descriptionPlaceholder')}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t(locale, 'groups.productsLabel')}</Label>
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={t(locale, 'groups.searchProducts')}
            />
            <div className="mt-1.5 border rounded-md overflow-y-auto max-h-44">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">
                  {t(locale, 'groups.noProductsFound')}
                </p>
              ) : (
                filtered.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => toggleProduct(product.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    <span className="text-sm flex-1">{product.name}</span>
                    {product.category && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {product.category}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedIds.length} {t(locale, 'groups.productsSelected')}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t(locale, 'groups.cancel')}
          </Button>
          <Button
            disabled={!name.trim() || saving}
            onClick={() => void handleSave()}
          >
            {saving ? t(locale, 'groups.saving') : group ? t(locale, 'groups.saveChanges') : t(locale, 'groups.createGroup')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
