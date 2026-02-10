'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Megaphone,
  Play,
  Eye,
  DollarSign,
  TrendingUp,
  Search,
  Zap,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  dailyBudget: number;
  totalBudget: number;
  status: string;
  startDate: string | null;
  createdAt: string;
  _count: { adSets: number; creatives: number; metrics: number };
}

interface CompetitorAd {
  id: string;
  competitorName: string;
  platform: string;
  adContent: string;
  aiAnalysis: string | null;
  collectedAt: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  pending_approval: { label: 'En attente', variant: 'outline' },
  approved: { label: 'Approuvée', variant: 'default' },
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminée', variant: 'outline' },
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-indigo-500',
  tiktok: 'bg-slate-800',
  google: 'bg-red-500',
};

export default function AdsPage() {
  const t = useTranslations('ads');
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (platformFilter) params.set('platform', platformFilter);

  const { data: campaigns, isLoading, mutate } = useApi<Campaign[]>(
    `/api/advertising/campaigns?${params.toString()}`,
  );
  const { data: competitors } = useApi<CompetitorAd[]>('/api/advertising/competitors');

  const filtered = (campaigns ?? []).filter((c) => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  // KPI aggregation from active campaigns
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === 'active');
  const totalDailyBudget = activeCampaigns.reduce((a, c) => a + c.dailyBudget, 0);

  const handleCollectMetrics = async () => {
    try {
      await apiClient('/api/advertising/collect-metrics', { method: 'POST' });
      toast({ title: 'Métriques collectées', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', description: 'Collecte des métriques échouée', variant: 'destructive' });
    }
  };

  const handleOptimize = async () => {
    try {
      await apiClient('/api/advertising/optimize', { method: 'POST' });
      toast({ title: 'Optimisation lancée', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', description: 'Optimisation échouée', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {activeCampaigns.length} campagne{activeCampaigns.length !== 1 ? 's' : ''} active{activeCampaigns.length !== 1 ? 's' : ''}
            {totalDailyBudget > 0 && ` — ${totalDailyBudget.toFixed(0)} EUR/jour`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCollectMetrics}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Collecter métriques
          </Button>
          <Button variant="outline" size="sm" onClick={handleOptimize}>
            <Zap className="mr-2 h-4 w-4" />
            Optimiser
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Campagnes actives</p>
                <p className="mt-1 text-2xl font-bold">{activeCampaigns.length}</p>
              </div>
              <Play className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget quotidien</p>
                <p className="mt-1 text-2xl font-bold">{totalDailyBudget.toFixed(0)} EUR</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total campagnes</p>
                <p className="mt-1 text-2xl font-bold">{(campaigns ?? []).length}</p>
              </div>
              <Megaphone className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Veille concurrentielle</p>
                <p className="mt-1 text-2xl font-bold">{(competitors ?? []).length}</p>
              </div>
              <Eye className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une campagne..."
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
            <SelectItem value="pending_approval">En attente</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
            <SelectItem value="completed">Terminée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px]">
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

      {/* Campaign List */}
      <div className="grid gap-4">
        {filtered.map((campaign) => {
          const statusInfo = STATUS_BADGES[campaign.status] ?? { label: campaign.status, variant: 'secondary' as const };
          return (
            <Link key={campaign.id} href={`/ads/${campaign.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-3 w-3 rounded-full ${PLATFORM_COLORS[campaign.platform] || 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {campaign.platform} &middot; {campaign.objective} &middot;
                          {' '}{campaign._count.adSets} ad sets &middot; {campaign._count.creatives} créatives
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{campaign.dailyBudget} EUR/j</p>
                        <p className="text-xs text-muted-foreground">
                          Total: {campaign.totalBudget} EUR
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune campagne</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Les campagnes sont générées automatiquement quand un contenu organique performe bien,
                ou manuellement via la proposition IA.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Competitor Intel */}
      {(competitors ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Veille concurrentielle récente
            </CardTitle>
            <CardDescription>Dernières publicités concurrentes détectées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(competitors ?? []).slice(0, 5).map((ad) => (
                <div key={ad.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{ad.competitorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ad.collectedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{ad.adContent}</p>
                  {ad.aiAnalysis && (
                    <p className="mt-1 text-xs text-primary line-clamp-2">{ad.aiAnalysis}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
