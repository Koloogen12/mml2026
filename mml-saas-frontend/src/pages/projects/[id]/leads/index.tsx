import { useState, useRef } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRight,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { EmptyState } from '@/shared/ui';
import { leadsApi, useLeads, type LeadListFilter } from '@/shared/api';
import { formatDate } from '@/shared/lib/formatDate';

const LIMIT = 20;

export const Component: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const projectId = parseInt(id!);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  const activeFilter: LeadListFilter = {
    offset: (page - 1) * LIMIT,
    limit: LIMIT,
    sort_by: 'created_at',
    sort_order: 'desc',
  };
  if (search) activeFilter.search = search;
  if (genderFilter !== 'all') activeFilter.gender = genderFilter;
  if (periodFilter !== 'all') activeFilter.period = periodFilter;

  const { data: leadsData, isLoading: loading } = useLeads(
    projectId,
    activeFilter,
  );
  const leads = leadsData?.leads ?? [];
  const total = leadsData?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);

  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  const formatGender = (gender?: string) => {
    if (!gender) return '—';
    if (gender === 'female') return t(locale, 'leads.genderFemaleLabel');
    if (gender === 'male') return t(locale, 'leads.genderMaleLabel');
    return gender;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await leadsApi.export(projectId, activeFilter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t(locale, 'leads.exportDownloaded'));
    } catch {
      toast.error(t(locale, 'leads.exportFailed'));
    } finally {
      setExporting(false);
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
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={t(locale, 'leads.searchPlaceholder')}
            className="pl-9 w-56"
          />
        </div>
        <Select
          value={genderFilter}
          onValueChange={handleFilterChange(setGenderFilter)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={t(locale, 'leads.headerGender')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(locale, 'leads.allGenders')}</SelectItem>
            <SelectItem value="female">{t(locale, 'leads.genderFemale')}</SelectItem>
            <SelectItem value="male">{t(locale, 'leads.genderMale')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={periodFilter}
          onValueChange={handleFilterChange(setPeriodFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t(locale, 'leads.allTime')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(locale, 'leads.allTime')}</SelectItem>
            <SelectItem value="today">{t(locale, 'leads.today')}</SelectItem>
            <SelectItem value="7d">{t(locale, 'leads.last7days')}</SelectItem>
            <SelectItem value="30d">{t(locale, 'leads.last30days')}</SelectItem>
            <SelectItem value="90d">{t(locale, 'leads.last90days')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            disabled={exporting || total === 0}
            onClick={() => void handleExport()}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? t(locale, 'leads.exporting') : t(locale, 'leads.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Table or empty/loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          {t(locale, 'leads.loading')}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t(locale, 'leads.emptyTitle')}
          description={t(locale, 'leads.emptyDescription')}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t(locale, 'leads.headerId')}</TableHead>
                <TableHead>{t(locale, 'leads.headerDate')}</TableHead>
                <TableHead>{t(locale, 'leads.headerGender')}</TableHead>
                <TableHead>{t(locale, 'leads.headerSize')}</TableHead>
                <TableHead>{t(locale, 'leads.headerTryOns')}</TableHead>
                <TableHead>{t(locale, 'leads.headerEmail')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => navigate(lp(`/projects/${id}/leads/${lead.id}`))}
                >
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {lead.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(lead.created_at, locale)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        lead.gender === 'female'
                          ? 'bg-pink-500/10 text-pink-700 border-pink-500/20'
                          : lead.gender === 'male'
                            ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                            : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                      }
                    >
                      {formatGender(lead.gender)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.size ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{lead.tryon_count}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lead.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
            {t(locale, 'leads.showing')} {from}–{to} {t(locale, 'leads.of')} {total}
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
  );
};
