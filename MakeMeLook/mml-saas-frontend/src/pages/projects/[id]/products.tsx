import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { toast } from 'sonner';
import {
  Plus,
  Upload,
  Search,
  Package,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AddIntegrationDialog } from '@/shared/ui/add-integration-dialog';
import { integrationsApi } from '@/shared/api/integrations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, ConfirmDialog } from '@/shared/ui';
import {
  productsApi,
  productKeys,
  useProducts,
  useProductGroups,
  useReference,
  type ProductListFilter,
} from '@/shared/api';

const LIMIT = 20;

// ─── Main Component ────────────────────────────────────────────────────────────

export const Component: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const projectId = parseInt(id!);

  // UI state
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Add to group dialog
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [addToGroupId, setAddToGroupId] = useState('');

  const queryClient = useQueryClient();
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  const activeFilter: ProductListFilter = {
    offset: (page - 1) * LIMIT,
    limit: LIMIT,
  };
  if (search) activeFilter.search = search;
  if (categoryFilter !== 'all') activeFilter.category = categoryFilter;
  if (genderFilter !== 'all') activeFilter.gender = genderFilter;
  if (groupFilter !== 'all') activeFilter.group_id = parseInt(groupFilter);
  if (statusFilter !== 'all')
    activeFilter.status = statusFilter as 'active' | 'inactive';

  const { data: productsData, isLoading: loading } = useProducts(
    projectId,
    activeFilter,
  );
  const products = productsData?.products ?? [];
  const total = productsData?.total ?? 0;

  const { data: groupsData } = useProductGroups(projectId);
  const groups = groupsData?.groups ?? [];

  const { data: referenceData } = useReference();
  const productCategories = referenceData?.product_categories ?? [];

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);

  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.includes(p.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : products.map((p) => p.id));
  };

  const toggleProduct = (pid: number) => {
    setSelectedIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  };

  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
    setSelectedIds([]);
  };

  const handleBulkActivate = async (action: 'activate' | 'deactivate') => {
    try {
      const res = await productsApi.bulkAction(projectId, {
        product_ids: selectedIds,
        action,
      });
      toast.success(res.message);
      setSelectedIds([]);
      void queryClient.invalidateQueries({
        queryKey: productKeys.all(projectId),
      });
    } catch {
      toast.error(t(locale, 'products.actionFailed'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await productsApi.bulkAction(projectId, {
        product_ids: selectedIds,
        action: 'delete',
      });
      toast.success(res.message);
      setSelectedIds([]);
      void queryClient.invalidateQueries({
        queryKey: productKeys.all(projectId),
      });
    } catch {
      toast.error(t(locale, 'products.deleteFailed'));
    }
  };

  const handleAddToGroup = async () => {
    if (!addToGroupId) return;
    try {
      const res = await productsApi.bulkAction(projectId, {
        product_ids: selectedIds,
        action: 'add_to_group',
        group_id: parseInt(addToGroupId),
      });
      toast.success(res.message);
      setSelectedIds([]);
      setAddToGroupOpen(false);
      setAddToGroupId('');
      void queryClient.invalidateQueries({
        queryKey: productKeys.all(projectId),
      });
    } catch {
      toast.error(t(locale, 'products.addToGroupFailed'));
    }
  };

  const handleDelete = async (productId: number, productName: string) => {
    try {
      await productsApi.delete(projectId, productId);
      toast.success(`"${productName}" ${t(locale, 'products.deleted')}`);
      setSelectedIds((prev) => prev.filter((x) => x !== productId));
      void queryClient.invalidateQueries({
        queryKey: productKeys.all(projectId),
      });
    } catch {
      toast.error(t(locale, 'products.deleteProductFailed'));
    }
  };

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filters + actions */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={t(locale, 'products.searchPlaceholder')}
              className="pl-9 w-56"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={handleFilterChange(setCategoryFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(locale, 'products.allCategories')}</SelectItem>
              {productCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={genderFilter}
            onValueChange={handleFilterChange(setGenderFilter)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(locale, 'products.allGenders')}</SelectItem>
              <SelectItem value="female">{t(locale, 'products.genderFemale')}</SelectItem>
              <SelectItem value="male">{t(locale, 'products.genderMale')}</SelectItem>
              <SelectItem value="unisex">{t(locale, 'products.genderUnisex')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={groupFilter}
            onValueChange={handleFilterChange(setGroupFilter)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(locale, 'products.allGroups')}</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={handleFilterChange(setStatusFilter)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(locale, 'products.allStatuses')}</SelectItem>
              <SelectItem value="active">{t(locale, 'products.statusActive')}</SelectItem>
              <SelectItem value="inactive">{t(locale, 'products.statusInactive')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <AddIntegrationDialog
              onAdd={async (data) => {
                await integrationsApi.create(Number(id), data);
                toast.success(t(locale, 'products.integrationConnected'));
              }}
            />
            <Button
              variant="outline"
              onClick={() => navigate(lp(`/projects/${id}/products/import`))}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t(locale, 'products.importCsv')}
            </Button>
            <Button onClick={() => navigate(lp(`/projects/${id}/products/new`))}>
              <Plus className="mr-2 h-4 w-4" />
              {t(locale, 'products.addProduct')}
            </Button>
          </div>
        </div>

        {/* Bulk action toolbar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted rounded-lg border flex-wrap">
            <span className="text-sm font-medium">
              {selectedIds.length} {t(locale, 'products.selected')}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleBulkActivate('activate')}
            >
              {t(locale, 'products.activate')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleBulkActivate('deactivate')}
            >
              {t(locale, 'products.deactivate')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddToGroupOpen(true)}
            >
              {t(locale, 'products.addToGroup')}
            </Button>
            <ConfirmDialog
              title={t(locale, 'products.deleteSelected')}
              description={`${selectedIds.length} ${t(locale, 'products.deleteSelectedDesc')}`}
              confirmText={t(locale, 'products.delete')}
              destructive
              onConfirm={handleBulkDelete}
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive ml-auto"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t(locale, 'products.delete')}
              </Button>
            </ConfirmDialog>
          </div>
        )}

        {/* Table or empty/loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            {t(locale, 'products.loading')}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t(locale, 'products.emptyTitle')}
            description={t(locale, 'products.emptyDescription')}
            actionLabel={t(locale, 'products.addProduct')}
            onAction={() => navigate(lp(`/projects/${id}/products/new`))}
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">{t(locale, 'products.headerPhoto')}</TableHead>
                  <TableHead>{t(locale, 'products.headerName')}</TableHead>
                  <TableHead>{t(locale, 'products.headerCategory')}</TableHead>
                  <TableHead>{t(locale, 'products.headerGender')}</TableHead>
                  <TableHead>{t(locale, 'products.headerStatus')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {product.photos[0]?.url ? (
                        <img
                          src={product.photos[0].url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {product.category ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {product.gender ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          product.is_active
                            ? 'bg-green-500/10 text-green-700 border-green-500/20'
                            : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                        }
                      >
                        {product.is_active ? t(locale, 'products.statusActive') : t(locale, 'products.statusInactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(
                                lp(`/projects/${id}/products/${product.id}/edit`),
                              )
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {t(locale, 'products.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            title={t(locale, 'products.deleteProduct')}
                            description={`"${product.name}" ${t(locale, 'products.deleteProductDesc')}`}
                            confirmText={t(locale, 'products.delete')}
                            destructive
                            onConfirm={() =>
                              handleDelete(product.id, product.name)
                            }
                          >
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t(locale, 'products.delete')}
                            </DropdownMenuItem>
                          </ConfirmDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              {t(locale, 'products.showing')} {from}–{to} {t(locale, 'products.of')} {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="text-sm text-muted-foreground px-1"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add to group dialog */}
      <Dialog open={addToGroupOpen} onOpenChange={setAddToGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t(locale, 'products.addToGroupTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Select value={addToGroupId} onValueChange={setAddToGroupId}>
              <SelectTrigger>
                <SelectValue placeholder={t(locale, 'products.selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToGroupOpen(false)}>
              {t(locale, 'products.cancel')}
            </Button>
            <Button
              disabled={!addToGroupId}
              onClick={() => void handleAddToGroup()}
            >
              {t(locale, 'products.addProducts')} {selectedIds.length} {t(locale, 'products.products')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
