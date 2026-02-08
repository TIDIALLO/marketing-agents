'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Play,
  Pause,
  Eye,
  Image,
  BarChart3,
  Wand2,
  Target,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChartComponent } from '@/components/charts/line-chart';
import { BarChartComponent } from '@/components/charts/bar-chart';
import type { AdCampaign, AdCreative, AdMetrics, CampaignStatus } from '@synap6ia/shared';

const statusVariant: Record<CampaignStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  pending_approval: 'warning',
  approved: 'outline',
  active: 'success',
  paused: 'default',
  completed: 'secondary',
  archived: 'secondary',
};

export default function AdDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: campaign, isLoading, mutate } = useApi<AdCampaign>(
    `/api/advertising/campaigns/${params.id}`,
  );
  const { data: creatives } = useApi<AdCreative[]>(
    `/api/advertising/campaigns/${params.id}/creatives`,
  );
  const { data: metrics } = useApi<AdMetrics[]>(
    `/api/advertising/campaigns/${params.id}/metrics`,
  );

  const handleLaunch = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/advertising/campaigns/${params.id}/launch`, { method: 'POST' });
      toast({ title: 'Campagne lancée', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', description: 'Le lancement a échoué', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/advertising/campaigns/${params.id}/pause`, { method: 'POST' });
      toast({ title: 'Campagne en pause', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/ads')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon('back')}
        </Button>
        <p className="text-muted-foreground">Campagne introuvable.</p>
      </div>
    );
  }

  const metricsChartData = (metrics ?? []).map((m) => ({
    date: new Date(m.collectedAt).toLocaleDateString(),
    impressions: m.impressions,
    clicks: m.clicks,
    spend: m.spend,
    ctr: +(m.ctr * 100).toFixed(2),
    roas: m.roas,
  }));

  const totalSpend = (metrics ?? []).reduce((sum, m) => sum + m.spend, 0);
  const totalClicks = (metrics ?? []).reduce((sum, m) => sum + m.clicks, 0);
  const totalImpressions = (metrics ?? []).reduce((sum, m) => sum + m.impressions, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';
  const avgRoas = (metrics ?? []).length > 0
    ? ((metrics ?? []).reduce((sum, m) => sum + m.roas, 0) / (metrics ?? []).length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/ads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={statusVariant[campaign.status]}>
                {campaign.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-muted-foreground capitalize">{campaign.platform}</span>
              <span className="text-sm text-muted-foreground capitalize">{campaign.objective}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {(campaign.status === 'approved' || campaign.status === 'paused') && (
            <Button onClick={handleLaunch} disabled={isSubmitting}>
              <Play className="mr-2 h-4 w-4" />
              Lancer
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button variant="outline" onClick={handlePause} disabled={isSubmitting}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Dépenses</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {totalSpend.toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Impressions</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {totalImpressions.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">CTR</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{avgCtr}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">ROAS</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{avgRoas}x</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Eye className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="creatives">
            <Image className="mr-2 h-4 w-4" />
            Créatifs
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Métriques
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <Wand2 className="mr-2 h-4 w-4" />
            Optimisation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget quotidien</span>
                  <span className="font-medium">{campaign.dailyBudget.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget total</span>
                  <span className="font-medium">{campaign.totalBudget.toLocaleString()} FCFA</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ciblage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Âge</span>
                  <span>{campaign.targeting.ageMin} - {campaign.targeting.ageMax} ans</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zones</span>
                  <span>{campaign.targeting.locations.join(', ') || '—'}</span>
                </div>
                {campaign.targeting.interests.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Intérêts</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {campaign.targeting.interests.map((i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="creatives">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(creatives ?? []).map((creative) => (
              <Card key={creative.id}>
                {creative.imageUrl && (
                  <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
                    <img
                      src={creative.imageUrl}
                      alt={creative.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <p className="font-medium">{creative.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{creative.body}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {creative.callToActionType}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {(creatives ?? []).length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">
                Aucun créatif pour cette campagne.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          {metricsChartData.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance dans le temps</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChartComponent
                    data={metricsChartData}
                    xDataKey="date"
                    series={[
                      { dataKey: 'ctr', name: 'CTR %', color: '#6366f1' },
                      { dataKey: 'roas', name: 'ROAS', color: '#10b981' },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dépenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={metricsChartData}
                    xDataKey="date"
                    series={[{ dataKey: 'spend', name: 'Dépenses (FCFA)', color: '#f59e0b' }]}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Les métriques seront disponibles après le lancement.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimization">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommandations IA</CardTitle>
              <CardDescription>
                Suggestions d&apos;optimisation basées sur les performances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-medium">KPI Cibles</p>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">CPC cible</span>
                      <p className="font-medium">{campaign.kpiTargets.targetCpc} FCFA</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CTR cible</span>
                      <p className="font-medium">{(campaign.kpiTargets.targetCtr * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ROAS cible</span>
                      <p className="font-medium">{campaign.kpiTargets.targetRoas}x</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
