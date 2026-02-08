'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function WeeklyReportPage() {
  const router = useRouter();
  const t = useTranslations('analytics');
  const { toast } = useToast();
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient<{ report: string }>('/api/analytics/weekly-report', {
        method: 'POST',
      });
      setReport(response.data.report);
      toast({ title: 'Rapport généré', variant: 'success' });
    } catch {
      toast({ title: 'Erreur', description: 'La génération du rapport a échoué', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/analytics')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{t('weeklyReport')}</h1>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Génération...' : 'Générer le rapport'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Rapport IA hebdomadaire</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isGenerating ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : report ? (
            <div className="prose dark:prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: report
                    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br />'),
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Cliquez sur &quot;Générer le rapport&quot; pour créer un rapport hebdomadaire IA
                basé sur les performances de la semaine.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
