import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { Loader2, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import {
  integrationsApi,
  type StoreCategoryResponse,
  type CategoryMappingResponse,
} from '@/shared/api/integrations';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

interface CategoryMappingDialogProps {
  projectId: number;
  storeId: number;
  storeName: string;
}

interface MappingRow {
  storeCategoryId: number;
  categoryName: string;
  categoryPath?: string;
  productType: string;
  gender: string;
}

const NONE = '__none__';

export const CategoryMappingDialog: FC<CategoryMappingDialogProps> = ({
  projectId,
  storeId,
  storeName,
}) => {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<MappingRow[]>([]);

  const PRODUCT_TYPES = [
    { value: NONE, label: t(locale, 'categoryMapping.notMapped') },
    { value: 'tops', label: t(locale, 'categoryMapping.typeTop') },
    { value: 'bottoms', label: t(locale, 'categoryMapping.typeBottom') },
    { value: 'outerwear', label: t(locale, 'categoryMapping.typeOutwear') },
    { value: 'shoes', label: t(locale, 'categoryMapping.typeShoes') },
    { value: 'accessories', label: t(locale, 'categoryMapping.typeAccessories') },
  ];

  const GENDERS = [
    { value: NONE, label: t(locale, 'categoryMapping.genderAuto') },
    { value: 'male', label: t(locale, 'categoryMapping.genderMale') },
    { value: 'female', label: t(locale, 'categoryMapping.genderFemale') },
    { value: 'unisex', label: t(locale, 'categoryMapping.genderUnisex') },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catResp, mapResp] = await Promise.all([
        integrationsApi.listCategories(projectId, storeId),
        integrationsApi.listMappings(projectId, storeId),
      ]);

      const mappingMap = new Map<number, CategoryMappingResponse>();
      for (const m of mapResp.mappings) {
        mappingMap.set(m.store_category_id, m);
      }

      const mapped: MappingRow[] = catResp.categories.map(
        (cat: StoreCategoryResponse) => {
          const existing = mappingMap.get(cat.id);
          return {
            storeCategoryId: cat.id,
            categoryName: cat.name,
            categoryPath: cat.full_path ?? undefined,
            productType: existing?.product_type || NONE,
            gender: existing?.gender || NONE,
          };
        },
      );
      setRows(mapped);
    } catch {
      toast.error(t(locale, 'categoryMapping.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [projectId, storeId, locale]);

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open, loadData]);

  const handleFetchCategories = async () => {
    setFetching(true);
    try {
      await integrationsApi.fetchCategories(projectId, storeId);
      toast.success(t(locale, 'categoryMapping.successFetch'));
      await loadData();
    } catch {
      toast.error(t(locale, 'categoryMapping.errorFetch'));
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    const mappings = rows
      .filter((r) => r.productType !== NONE)
      .map((r) => ({
        store_category_id: r.storeCategoryId,
        product_type: r.productType,
        gender: r.gender !== NONE ? r.gender : undefined,
      }));

    if (mappings.length === 0) {
      toast.error(t(locale, 'categoryMapping.errorNoMappings'));
      return;
    }

    setSaving(true);
    try {
      await integrationsApi.saveMappings(projectId, storeId, { mappings });
      toast.success(t(locale, 'categoryMapping.successSave'));
      setOpen(false);
    } catch {
      toast.error(t(locale, 'categoryMapping.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (
    index: number,
    field: 'productType' | 'gender',
    value: string,
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="cursor-pointer">
          <FolderTree className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t(locale, 'categoryMapping.title').replace('{storeName}', storeName)}
          </DialogTitle>
          <DialogDescription>
            {t(locale, 'categoryMapping.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleFetchCategories()}
            disabled={fetching}
            className="cursor-pointer"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t(locale, 'categoryMapping.fetching')}
              </>
            ) : (
              t(locale, 'categoryMapping.fetchBtn')
            )}
          </Button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t(locale, 'categoryMapping.noCategories')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(locale, 'categoryMapping.colStoreCategory')}</TableHead>
                  <TableHead>{t(locale, 'categoryMapping.colProductType')}</TableHead>
                  <TableHead>{t(locale, 'categoryMapping.colGender')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.storeCategoryId}>
                    <TableCell>
                      <span className="font-medium">{row.categoryName}</span>
                      {row.categoryPath && (
                        <p className="text-xs text-muted-foreground">
                          {row.categoryPath}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.productType}
                        onValueChange={(v) =>
                          updateRow(index, 'productType', v)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.gender}
                        onValueChange={(v) => updateRow(index, 'gender', v)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            {t(locale, 'categoryMapping.cancel')}
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || rows.length === 0}
            className="cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t(locale, 'categoryMapping.saving')}
              </>
            ) : (
              t(locale, 'categoryMapping.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
