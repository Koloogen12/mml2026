import { useState } from 'react';
import type { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Layers, Lock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, EmptyState, ConfirmDialog } from '@/shared/ui';
import {
  productGroupsApi,
  groupKeys,
  productKeys,
  useProductGroups,
  type ProductGroupResponse,
} from '@/shared/api';
import { GroupDialog } from './GroupDialog';

export const Component: FC = () => {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const projectId = parseInt(id!);
  const queryClient = useQueryClient();

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroupResponse | null>(
    null,
  );

  const { data: groupsData } = useProductGroups(projectId);
  const groups = groupsData?.groups ?? [];

  const handleDeleteGroup = async (groupId: number, groupName: string) => {
    try {
      await productGroupsApi.delete(projectId, groupId);
      toast.success(`"${groupName}" ${t(locale, 'groups.deleted')}`);
      void queryClient.invalidateQueries({
        queryKey: groupKeys.all(projectId),
      });
    } catch {
      toast.error(t(locale, 'groups.deleteFailed'));
    }
  };

  return (
    <>
      <PageHeader
        title={t(locale, 'groups.title')}
        actions={
          <Button
            onClick={() => {
              setEditingGroup(null);
              setGroupDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t(locale, 'groups.createGroup')}
          </Button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t(locale, 'groups.emptyTitle')}
          description={t(locale, 'groups.emptyDescription')}
          actionLabel={t(locale, 'groups.createGroup')}
          onAction={() => {
            setEditingGroup(null);
            setGroupDialogOpen(true);
          }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, 'groups.headerName')}</TableHead>
                <TableHead>{t(locale, 'groups.headerProducts')}</TableHead>
                <TableHead>{t(locale, 'groups.headerStatus')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{group.name}</span>
                        {group.is_permanent && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-xs font-normal"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            {t(locale, 'groups.permanent')}
                          </Badge>
                        )}
                      </div>
                      {group.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {group.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.products_count} {t(locale, 'groups.products')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        group.is_active
                          ? 'bg-green-500/10 text-green-700 border-green-500/20'
                          : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                      }
                    >
                      {group.is_active ? t(locale, 'groups.statusActive') : t(locale, 'groups.statusInactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingGroup(group);
                            setGroupDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {t(locale, 'groups.edit')}
                        </DropdownMenuItem>
                        {!group.is_permanent && (
                          <>
                            <DropdownMenuSeparator />
                            <ConfirmDialog
                              title={t(locale, 'groups.deleteGroup')}
                              description={`"${group.name}" ${t(locale, 'groups.deleteGroupDesc')}`}
                              confirmText={t(locale, 'groups.delete')}
                              destructive
                              onConfirm={() =>
                                handleDeleteGroup(group.id, group.name)
                              }
                            >
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t(locale, 'groups.delete')}
                              </DropdownMenuItem>
                            </ConfirmDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <GroupDialog
        key={editingGroup?.id ?? 'new'}
        open={groupDialogOpen}
        projectId={projectId}
        group={editingGroup}
        onClose={() => setGroupDialogOpen(false)}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: groupKeys.all(projectId),
          });
          void queryClient.invalidateQueries({
            queryKey: productKeys.all(projectId),
          });
        }}
      />
    </>
  );
};
