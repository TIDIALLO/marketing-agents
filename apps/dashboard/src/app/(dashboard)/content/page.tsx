'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, Search } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { ContentPiece, ContentStatus, Platform } from '@mktengine/shared';

const statusVariantMap: Record<ContentStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  review: 'warning',
  approved: 'outline',
  scheduled: 'default',
  published: 'success',
  failed: 'destructive',
};

const platformColors: Record<Platform, string> = {
  linkedin: 'text-blue-600',
  facebook: 'text-blue-500',
  instagram: 'text-pink-500',
  tiktok: 'text-foreground',
  twitter: 'text-sky-500',
};

export default function ContentPage() {
  const t = useTranslations('content');
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

  const { data, isLoading, pagination } = useApi<ContentPiece[]>(
    `/api/content/pieces?${params.toString()}`,
  );

  const columns: Column<ContentPiece>[] = [
    {
      key: 'title',
      header: 'Titre',
      sortable: true,
      render: (item) => (
        <Link href={`/content/${item.id}`} className="font-medium hover:underline">
          {item.title}
        </Link>
      ),
    },
    {
      key: 'platform',
      header: 'Plateforme',
      render: (item) => (
        <span className={platformColors[item.platform]}>
          {item.platform}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: (item) => (
        <Badge variant={statusVariantMap[item.status]}>
          {t(item.status)}
        </Badge>
      ),
    },
    {
      key: 'engagementScore',
      header: 'Engagement',
      sortable: true,
      className: 'text-right',
      render: (item) => (
        <span className="tabular-nums">{item.engagementScore}</span>
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/content/calendar">
            <Button variant="outline">Calendrier</Button>
          </Link>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>
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
            <SelectItem value="draft">{t('draft')}</SelectItem>
            <SelectItem value="review">{t('pendingApproval')}</SelectItem>
            <SelectItem value="approved">{t('approved')}</SelectItem>
            <SelectItem value="scheduled">{t('scheduled')}</SelectItem>
            <SelectItem value="published">{t('published')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Plateforme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<ContentPiece>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyTitle={tCommon('noResults')}
        emptyDescription="Aucun contenu ne correspond à vos filtres."
        emptyAction={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer un contenu
          </Button>
        }
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
