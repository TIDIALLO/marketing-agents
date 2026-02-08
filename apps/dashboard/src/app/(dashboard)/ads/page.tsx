'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Plus } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { AdCampaign, CampaignStatus } from '@synap6ia/shared';

const statusVariant: Record<CampaignStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  pending_approval: 'warning',
  approved: 'outline',
  active: 'success',
  paused: 'default',
  completed: 'secondary',
  archived: 'secondary',
};

export default function AdsPage() {
  const t = useTranslations('ads');
  const tCommon = useTranslations('common');

  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { page, setPage, queryString } = usePagination();

  const params = new URLSearchParams(queryString);
  if (statusFilter) params.set('status', statusFilter);
  if (platformFilter) params.set('platform', platformFilter);
  if (debouncedSearch) params.set('search', debouncedSearch);

  const { data: campaigns, isLoading, pagination } = useApi<AdCampaign[]>(
    `/api/advertising/campaigns?${params.toString()}`,
  );

  const columns: Column<AdCampaign>[] = [
    {
      key: 'name',
      header: 'Campagne',
      sortable: true,
      render: (item) => (
        <Link href={`/ads/${item.id}`} className="font-medium hover:underline">
          {item.name}
        </Link>
      ),
    },
    {
      key: 'platform',
      header: 'Plateforme',
      render: (item) => (
        <span className="capitalize">{item.platform}</span>
      ),
    },
    {
      key: 'objective',
      header: 'Objectif',
      render: (item) => (
        <span className="capitalize">{item.objective}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: (item) => (
        <Badge variant={statusVariant[item.status]}>
          {item.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'dailyBudget',
      header: 'Budget/jour',
      sortable: true,
      className: 'text-right',
      render: (item) => (
        <span className="tabular-nums">{item.dailyBudget.toLocaleString()} FCFA</span>
      ),
    },
    {
      key: 'kpiTargets',
      header: 'CTR cible',
      className: 'text-right',
      render: (item) => (
        <span className="tabular-nums">{(item.kpiTargets.targetCtr * 100).toFixed(1)}%</span>
      ),
    },
    {
      key: 'roas',
      header: 'ROAS cible',
      className: 'text-right',
      render: (item) => (
        <span className="tabular-nums">{item.kpiTargets.targetRoas.toFixed(1)}x</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {tCommon('create')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tCommon('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Plateforme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="google">Google</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<AdCampaign>
        columns={columns}
        data={campaigns ?? []}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyTitle={tCommon('noResults')}
        emptyDescription="Aucune campagne ne correspond à vos filtres."
        emptyAction={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer une campagne
          </Button>
        }
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
