'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FileText, Zap } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/charts/sparkline';
import { AreaChartComponent } from '@/components/charts/area-chart';
import { PieChartComponent } from '@/components/charts/pie-chart';
import type { ContentSignal } from '@synap6ia/shared';

interface DashboardKPI {
  contentsPublished: number;
  totalImpressions: number;
  totalEngagements: number;
  leadsGenerated: number;
  adSpend: number;
  conversions: number;
  sparklines: {
    impressions: number[];
    engagements: number[];
    leads: number[];
    spend: number[];
  };
}

interface TrendData {
  date: string;
  impressions: number;
  engagements: number;
  clicks: number;
  [key: string]: unknown;
}

interface TopPost {
  id: string;
  title: string;
  platform: string;
  engagementRate: number;
  impressions: number;
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');

  const { data: kpi, isLoading: kpiLoading } = useApi<DashboardKPI>('/api/analytics/dashboard');
  const { data: trends, isLoading: trendsLoading } = useApi<TrendData[]>('/api/analytics/trends');
  const { data: topPosts } = useApi<TopPost[]>('/api/analytics/top-posts');
  const { data: signals } = useApi<ContentSignal[]>('/api/analytics/signals');

  const platformData = [
    { name: 'LinkedIn', value: 35, color: '#0077B5' },
    { name: 'Facebook', value: 30, color: '#1877F2' },
    { name: 'Instagram', value: 20, color: '#E4405F' },
    { name: 'TikTok', value: 15, color: '#000000' },
  ];

  const kpiCards = kpi
    ? [
        {
          label: t('impressions'),
          value: kpi.totalImpressions.toLocaleString(),
          sparkData: kpi.sparklines.impressions,
          color: '#6366f1',
        },
        {
          label: t('engagements'),
          value: kpi.totalEngagements.toLocaleString(),
          sparkData: kpi.sparklines.engagements,
          color: '#10b981',
        },
        {
          label: 'Leads',
          value: kpi.leadsGenerated.toLocaleString(),
          sparkData: kpi.sparklines.leads,
          color: '#f59e0b',
        },
        {
          label: 'Ad Spend',
          value: `${kpi.adSpend.toLocaleString()} FCFA`,
          sparkData: kpi.sparklines.spend,
          color: '#ef4444',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Link href="/analytics/report">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            {t('weeklyReport')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((card) => (
              <Card key={card.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="mt-1 text-2xl font-bold">{card.value}</p>
                    </div>
                    <Sparkline data={card.sparkData} color={card.color} />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t('trends')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChartComponent
              data={trends ?? []}
              xDataKey="date"
              series={[
                { dataKey: 'impressions', name: t('impressions'), color: '#6366f1' },
                { dataKey: 'engagements', name: t('engagements'), color: '#10b981' },
              ]}
              isLoading={trendsLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plateformes</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent data={platformData} height={250} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('topPosts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(topPosts ?? []).map((post, index) => (
                <Link
                  key={post.id}
                  href={`/content/${post.id}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{post.platform}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {(post.engagementRate * 100).toFixed(1)}%
                  </span>
                </Link>
              ))}
              {(topPosts ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('signals')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(signals ?? []).map((signal) => (
                <div key={signal.id} className="flex items-start gap-3 rounded-md border p-3">
                  <Zap className="mt-0.5 h-4 w-4 text-yellow-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        signal.signalType === 'viral_potential' ? 'success' :
                        signal.signalType === 'high_engagement' ? 'warning' : 'default'
                      }>
                        {signal.signalType.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Force: {signal.signalStrength}/10
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {signal.aiRecommendation}
                    </p>
                  </div>
                </div>
              ))}
              {(signals ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun signal détecté.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
