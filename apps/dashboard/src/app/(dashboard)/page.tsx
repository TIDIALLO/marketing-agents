'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useTranslations } from 'next-intl';
import { useSocket } from '@/providers/SocketProvider';
import { useSSE } from '@/hooks/use-sse';
import { useApi } from '@/hooks/use-api';
import { Sparkline } from '@/components/charts/sparkline';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  FileText,
  Megaphone,
  Users,
  Wifi,
  WifiOff,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Flame,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardKPI {
  contentsPublished: number;
  leadsGenerated: number;
  avgROAS: number;
  engagementRate: number;
  sparklines: {
    contents: number[];
    leads: number[];
    roas: number[];
    engagement: number[];
  };
}

interface ThisWeekData {
  period: { from: string; to: string };
  stats: {
    postsPublished: number;
    postsScheduled: number;
    pendingApprovals: number;
    newLeads: number;
    hotLeads: number;
    impressions: number;
    engagements: number;
    likes: number;
    comments: number;
    shares: number;
  };
  topPost: {
    id: string;
    title: string;
    platform: string;
    engagementScore: number;
    publishedAt: string;
  } | null;
  upcomingSchedules: Array<{
    id: string;
    scheduledAt: string;
    contentPiece: { id: string; title: string; platform: string; mediaUrl: string | null };
    socialAccount: { platformUsername: string; platform: string };
  }>;
  actionItems: Array<{
    type: string;
    label: string;
    count: number;
    priority: string;
  }>;
}

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-500',
  twitter: 'bg-sky-400',
  facebook: 'bg-indigo-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-slate-800',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const tAgents = useTranslations('agents');
  const { isConnected: wsConnected } = useSocket();
  const { data: kpi, isConnected: sseConnected } = useSSE<DashboardKPI>('/api/analytics/stream');
  const { data: thisWeek } = useApi<ThisWeekData>('/api/analytics/this-week');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('welcome', { firstName: user?.firstName ?? '' })}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-1">
          {wsConnected || sseConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {wsConnected || sseConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Action Items */}
      {thisWeek?.actionItems && thisWeek.actionItems.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {thisWeek.actionItems.map((item) => (
            <Card key={item.type} className={item.priority === 'critical' ? 'border-red-500/50' : 'border-amber-500/50'}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  item.priority === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${
                    item.priority === 'critical' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-2xl font-bold">{item.count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* This Week Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Posts publiés</p>
                <p className="mt-1 text-2xl font-bold">{thisWeek?.stats.postsPublished ?? '—'}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Programmés</p>
                <p className="mt-1 text-2xl font-bold">{thisWeek?.stats.postsScheduled ?? '—'}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impressions</p>
                <p className="mt-1 text-2xl font-bold">
                  {thisWeek?.stats.impressions?.toLocaleString() ?? '—'}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nouveaux leads</p>
                <p className="mt-1 text-2xl font-bold">{thisWeek?.stats.newLeads ?? '—'}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Sparklines */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t('contentsPublished'),
            value: kpi?.contentsPublished?.toLocaleString() ?? '—',
            spark: kpi?.sparklines?.contents,
            color: '#6366f1',
          },
          {
            label: t('leadsGenerated'),
            value: kpi?.leadsGenerated?.toLocaleString() ?? '—',
            spark: kpi?.sparklines?.leads,
            color: '#10b981',
          },
          {
            label: t('avgROAS'),
            value: kpi?.avgROAS ? `${kpi.avgROAS.toFixed(1)}x` : '—',
            spark: kpi?.sparklines?.roas,
            color: '#f59e0b',
          },
          {
            label: t('engagementRate'),
            value: kpi?.engagementRate ? `${(kpi.engagementRate * 100).toFixed(1)}%` : '—',
            spark: kpi?.sparklines?.engagement,
            color: '#ef4444',
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                {stat.spark && <Sparkline data={stat.spark} color={stat.color} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Posts à venir
            </CardTitle>
            <CardDescription>Prochaines publications programmées</CardDescription>
          </CardHeader>
          <CardContent>
            {thisWeek?.upcomingSchedules && thisWeek.upcomingSchedules.length > 0 ? (
              <div className="space-y-3">
                {thisWeek.upcomingSchedules.slice(0, 5).map((schedule) => (
                  <Link
                    key={schedule.id}
                    href={`/content/${schedule.contentPiece.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <span className={`h-2 w-2 rounded-full ${PLATFORM_COLORS[schedule.contentPiece.platform] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{schedule.contentPiece.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(schedule.scheduledAt).toLocaleDateString('fr-FR', {
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                        {' '}&middot;{' '}
                        {schedule.socialAccount.platformUsername ?? schedule.contentPiece.platform}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune publication programmée
              </p>
            )}
            <div className="mt-3 pt-3 border-t">
              <Link href="/content/calendar" className="text-sm text-primary hover:underline">
                Voir le calendrier complet
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Top Post + Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance cette semaine
            </CardTitle>
            <CardDescription>Engagement et meilleur post</CardDescription>
          </CardHeader>
          <CardContent>
            {thisWeek?.topPost ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Meilleur post</p>
                  <p className="text-sm font-medium">{thisWeek.topPost.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`h-2 w-2 rounded-full ${PLATFORM_COLORS[thisWeek.topPost.platform] || 'bg-gray-400'}`} />
                    <span className="text-xs capitalize text-muted-foreground">{thisWeek.topPost.platform}</span>
                    <span className="text-xs text-muted-foreground">&middot;</span>
                    <span className="text-xs font-medium text-green-500">Score: {thisWeek.topPost.engagementScore.toFixed(0)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold">{thisWeek.stats.likes.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{thisWeek.stats.comments.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Commentaires</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{thisWeek.stats.shares.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Partages</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Pas encore de données cette semaine
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Status */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t('aiAgents')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              nameKey: 'contentFlywheel' as const,
              descKey: 'contentFlywheelDesc' as const,
              icon: FileText,
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
              stat: thisWeek ? `${thisWeek.stats.postsPublished} publiés` : null,
            },
            {
              nameKey: 'amplificationEngine' as const,
              descKey: 'amplificationEngineDesc' as const,
              icon: Megaphone,
              color: 'text-orange-500',
              bg: 'bg-orange-500/10',
              stat: null,
            },
            {
              nameKey: 'opportunityHunter' as const,
              descKey: 'opportunityHunterDesc' as const,
              icon: Users,
              color: 'text-green-500',
              bg: 'bg-green-500/10',
              stat: thisWeek ? `${thisWeek.stats.newLeads} leads` : null,
            },
          ].map((agent) => (
            <Card key={agent.nameKey}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${agent.bg}`}
                >
                  <agent.icon className={`h-5 w-5 ${agent.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {tAgents(agent.nameKey)}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {tAgents(agent.descKey)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${agent.stat ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <span className="text-sm text-muted-foreground">
                    {agent.stat ?? t('pending')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
