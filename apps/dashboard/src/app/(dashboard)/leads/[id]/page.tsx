'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Zap,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Timeline, type TimelineItem } from '@/components/ui/timeline';
import type { Lead, LeadInteraction, LeadTemperature } from '@synap6ia/shared';

const tempVariant: Record<LeadTemperature, 'destructive' | 'warning' | 'secondary'> = {
  hot: 'destructive',
  warm: 'warning',
  cold: 'secondary',
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('leads');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: lead, isLoading, mutate } = useApi<Lead>(
    `/api/leads/${params.id}`,
  );
  const { data: interactions } = useApi<LeadInteraction[]>(
    `/api/leads/${params.id}/interactions`,
  );

  const handleScore = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/leads/${params.id}/score`, { method: 'POST' });
      toast({ title: 'Score recalculé', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBook = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/leads/${params.id}/book`, {
        method: 'POST',
        body: { scheduledAt: new Date(Date.now() + 172800000).toISOString() },
      });
      toast({ title: 'Rendez-vous programmé', variant: 'success' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/leads/${params.id}/escalate`, { method: 'POST' });
      toast({ title: 'Lead escaladé', variant: 'success' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/leads')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon('back')}
        </Button>
        <p className="text-muted-foreground">Lead introuvable.</p>
      </div>
    );
  }

  const timelineItems: TimelineItem[] = (interactions ?? []).map((i) => ({
    id: i.id,
    title: `${i.direction === 'inbound' ? '←' : '→'} ${i.channel}`,
    description: i.content,
    timestamp: new Date(i.createdAt).toLocaleString(),
    color: i.aiSentiment === 'positive'
      ? 'border-green-500'
      : i.aiSentiment === 'negative'
        ? 'border-red-500'
        : undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {lead.firstName} {lead.lastName}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              {lead.temperature && (
                <Badge variant={tempVariant[lead.temperature]}>
                  {t(lead.temperature)}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground capitalize">
                {lead.status}
              </span>
              {lead.score !== null && (
                <span className="text-sm font-medium">
                  {t('score')}: {lead.score}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleScore} disabled={isSubmitting}>
            <Zap className="mr-2 h-4 w-4" />
            Rescorer
          </Button>
          <Button variant="outline" size="sm" onClick={handleBook} disabled={isSubmitting}>
            <Calendar className="mr-2 h-4 w-4" />
            Rendez-vous
          </Button>
          <Button variant="destructive" size="sm" onClick={handleEscalate} disabled={isSubmitting}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Escalader
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${lead.email}`} className="hover:underline">
                {lead.email}
              </a>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{lead.company}</span>
              </div>
            )}
            <div className="border-t pt-3 space-y-1 text-sm text-muted-foreground">
              <p>Source: <span className="text-foreground capitalize">{lead.source}</span></p>
              {lead.utmCampaign && <p>Campaign: {lead.utmCampaign}</p>}
              <p>GDPR: {lead.gdprConsent ? 'Oui' : 'Non'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineItems.length > 0 ? (
              <Timeline items={timelineItems} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune interaction enregistrée.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
