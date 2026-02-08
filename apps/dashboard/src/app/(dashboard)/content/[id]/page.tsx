'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Send,
  Calendar,
  Copy,
  Eye,
  Edit2,
  BarChart3,
  Clock,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { LineChartComponent } from '@/components/charts/line-chart';
import type { ContentPiece, ContentMetrics } from '@synap6ia/shared';

const statusVariantMap = {
  draft: 'secondary',
  review: 'warning',
  approved: 'outline',
  scheduled: 'default',
  published: 'success',
  failed: 'destructive',
} as const;

export default function ContentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('content');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: piece, isLoading, mutate } = useApi<ContentPiece>(
    `/api/content/pieces/${params.id}`,
  );
  const { data: metrics } = useApi<ContentMetrics[]>(
    piece?.status === 'published' ? `/api/content/pieces/${params.id}/metrics` : null,
  );

  const handleAdapt = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/content/pieces/${params.id}/adapt`, { method: 'POST' });
      toast({ title: 'Adaptation lancée', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', description: "L'adaptation a échoué", variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/content/pieces/${params.id}/schedule`, {
        method: 'POST',
        body: { scheduledAt: new Date(Date.now() + 86400000).toISOString() },
      });
      toast({ title: 'Contenu programmé', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', description: 'La programmation a échoué', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/content')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon('back')}
        </Button>
        <p className="text-muted-foreground">Contenu introuvable.</p>
      </div>
    );
  }

  const metricsChartData = (metrics ?? []).map((m) => ({
    date: new Date(m.collectedAt).toLocaleDateString(),
    impressions: m.impressions,
    engagements: m.engagements,
    clicks: m.clicks,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/content')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{piece.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={statusVariantMap[piece.status]}>{t(piece.status)}</Badge>
              <span className="text-sm text-muted-foreground">{piece.platform}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAdapt} disabled={isSubmitting}>
            <Copy className="mr-2 h-4 w-4" />
            Adapter
          </Button>
          {piece.status === 'approved' && (
            <Button onClick={handleSchedule} disabled={isSubmitting}>
              <Calendar className="mr-2 h-4 w-4" />
              Programmer
            </Button>
          )}
          {piece.status === 'draft' && (
            <Button onClick={async () => {
              await apiClient(`/api/content/pieces/${params.id}`, {
                method: 'PUT',
                body: { status: 'review' },
              });
              toast({ title: 'Envoyé pour approbation', variant: 'success' });
              await mutate();
            }} disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              Soumettre
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="edit">
            <Edit2 className="mr-2 h-4 w-4" />
            Édition
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Métriques
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="mr-2 h-4 w-4" />
            Activité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <Card>
            <CardContent className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{piece.body}</p>
              </div>
              {piece.hashtags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {piece.hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary">#{tag}</Badge>
                  ))}
                </div>
              )}
              {piece.callToAction && (
                <div className="mt-4 rounded-md bg-muted p-3">
                  <p className="text-sm font-medium">Call to Action</p>
                  <p className="text-sm text-muted-foreground">{piece.callToAction}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Contenu</label>
                <Textarea
                  className="mt-1"
                  rows={10}
                  defaultValue={piece.body}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Call to Action</label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  defaultValue={piece.callToAction ?? ''}
                />
              </div>
              <Button>{tCommon('save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          {piece.status === 'published' && metricsChartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChartComponent
                  data={metricsChartData}
                  xDataKey="date"
                  series={[
                    { dataKey: 'impressions', name: 'Impressions', color: '#6366f1' },
                    { dataKey: 'engagements', name: 'Engagements', color: '#10b981' },
                    { dataKey: 'clicks', name: 'Clics', color: '#f59e0b' },
                  ]}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Les métriques seront disponibles après la publication.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-sm">
                    Créé le {new Date(piece.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {piece.publishedAt && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-sm">
                      Publié le {new Date(piece.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
