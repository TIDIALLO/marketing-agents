'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, LayoutGrid, List, Kanban } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Funnel, type FunnelStage } from '@/components/ui/funnel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { Lead, LeadTemperature, LeadStatus } from '@mktengine/shared';

const tempVariant: Record<LeadTemperature, 'destructive' | 'warning' | 'secondary'> = {
  hot: 'destructive',
  warm: 'warning',
  cold: 'secondary',
};

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500',
  qualified: 'bg-green-500',
  nurturing: 'bg-yellow-500',
  opportunity: 'bg-purple-500',
  converted: 'bg-emerald-500',
  lost: 'bg-gray-400',
};

interface PipelineData {
  new: number;
  qualified: number;
  nurturing: number;
  opportunity: number;
  converted: number;
}

export default function LeadsPage() {
  const t = useTranslations('leads');
  const tCommon = useTranslations('common');
  const [view, setView] = useState<'funnel' | 'table'>('funnel');
  const [tempFilter, setTempFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { page, setPage, queryString } = usePagination();

  const params = new URLSearchParams(queryString);
  if (tempFilter) params.set('temperature', tempFilter);
  if (sourceFilter) params.set('source', sourceFilter);
  if (debouncedSearch) params.set('search', debouncedSearch);

  const { data: leads, isLoading, pagination } = useApi<Lead[]>(
    `/api/leads?${params.toString()}`,
  );
  const { data: pipeline } = useApi<PipelineData>('/api/leads/pipeline');

  const funnelStages: FunnelStage[] = pipeline
    ? [
        { label: t('new'), value: pipeline.new, color: 'bg-blue-500' },
        { label: t('qualified'), value: pipeline.qualified, color: 'bg-green-500' },
        { label: 'Nurturing', value: pipeline.nurturing, color: 'bg-yellow-500' },
        { label: 'Opportunity', value: pipeline.opportunity, color: 'bg-purple-500' },
        { label: t('converted'), value: pipeline.converted, color: 'bg-emerald-500' },
      ]
    : [];

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Nom',
      sortable: true,
      render: (item) => (
        <Link href={`/leads/${item.id}`} className="font-medium hover:underline">
          {item.firstName} {item.lastName}
        </Link>
      ),
    },
    {
      key: 'company',
      header: 'Entreprise',
      render: (item) => <span>{item.company}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (item) => <span className="capitalize">{item.source}</span>,
    },
    {
      key: 'temperature',
      header: 'Temp.',
      render: (item) =>
        item.temperature ? (
          <Badge variant={tempVariant[item.temperature]}>{t(item.temperature)}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'score',
      header: t('score'),
      sortable: true,
      className: 'text-right',
      render: (item) => (
        <span className="tabular-nums font-medium">
          {item.score !== null ? item.score : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${statusColors[item.status]}`} />
          <span className="text-sm capitalize">{item.status}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <Link href="/leads/pipeline">
            <Button variant="outline" size="sm">
              <Kanban className="mr-2 h-4 w-4" />
              Pipeline Kanban
            </Button>
          </Link>
          <div className="flex gap-1 rounded-md border p-1">
            <Button
              variant={view === 'funnel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('funnel')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === 'funnel' && pipeline && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Funnel stages={funnelStages} />
          </CardContent>
        </Card>
      )}

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
        <Select value={tempFilter} onValueChange={setTempFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Température" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            <SelectItem value="hot">{t('hot')}</SelectItem>
            <SelectItem value="warm">{t('warm')}</SelectItem>
            <SelectItem value="cold">{t('cold')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            <SelectItem value="form">Formulaire</SelectItem>
            <SelectItem value="ad">Publicité</SelectItem>
            <SelectItem value="webinar">Webinar</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="manual">Manuel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<Lead>
        columns={columns}
        data={leads ?? []}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyTitle={tCommon('noResults')}
        emptyDescription="Aucun lead ne correspond à vos filtres."
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
