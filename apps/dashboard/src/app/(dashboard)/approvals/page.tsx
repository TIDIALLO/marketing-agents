'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { ApprovalStatus, ApprovalEntityType } from '@mktengine/shared';

interface ApprovalItem {
  id: string;
  entityType: ApprovalEntityType;
  entityId: string;
  status: ApprovalStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: string;
  title: string;
  createdAt: string;
}

const priorityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'warning',
  urgent: 'destructive',
};

const statusVariant: Record<ApprovalStatus, 'default' | 'secondary' | 'success' | 'destructive'> = {
  pending: 'default',
  approved: 'success',
  rejected: 'destructive',
  modified: 'secondary',
};

export default function ApprovalsPage() {
  const t = useTranslations('approvals');
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const { data: queue, isLoading, mutate } = useApi<ApprovalItem[]>(
    `/api/approval/queue?status=${statusFilter}`,
  );

  const handleResolve = async (id: string, status: 'approved' | 'rejected') => {
    setSubmittingId(id);
    try {
      await apiClient(`/api/approval/queue/${id}/resolve`, {
        method: 'POST',
        body: { status },
      });
      toast({
        title: status === 'approved' ? 'Approuvé' : 'Rejeté',
        variant: status === 'approved' ? 'success' : 'default',
      });
      await mutate();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setSubmittingId(null);
    }
  };

  const getHoursWaiting = (createdAt: string) => {
    return Math.round((Date.now() - new Date(createdAt).getTime()) / 3600000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t('pending')}</SelectItem>
            <SelectItem value="approved">{t('approved')}</SelectItem>
            <SelectItem value="rejected">{t('rejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (queue ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune approbation en attente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(queue ?? []).map((item) => {
            const hoursWaiting = getHoursWaiting(item.createdAt);
            const entityLink = item.entityType === 'content_piece'
              ? `/content/${item.entityId}`
              : `/ads/${item.entityId}`;

            return (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant={priorityVariant[item.priority]} className="text-xs">
                        {item.priority}
                      </Badge>
                    </div>
                    <div>
                      <Link href={entityLink} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {item.entityType === 'content_piece' ? t('contentPiece') : t('adCampaign')}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('waitingSince', { hours: hoursWaiting })}
                        </span>
                        <Badge variant={statusVariant[item.status]} className="text-xs">
                          {t(item.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(item.id, 'rejected')}
                        disabled={submittingId === item.id}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        {t('reject')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleResolve(item.id, 'approved')}
                        disabled={submittingId === item.id}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {t('approve')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
