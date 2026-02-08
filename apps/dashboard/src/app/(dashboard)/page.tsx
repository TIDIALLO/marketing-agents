'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useTranslations } from 'next-intl';
import { useSocket } from '@/providers/SocketProvider';
import { useSSE } from '@/hooks/use-sse';
import { Sparkline } from '@/components/charts/sparkline';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { FileText, Megaphone, Users, Wifi, WifiOff } from 'lucide-react';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const tAgents = useTranslations('agents');
  const { isConnected: wsConnected } = useSocket();
  const { data: kpi, isConnected: sseConnected } = useSSE<DashboardKPI>('/api/analytics/stream');

  const agentCards = [
    {
      nameKey: 'contentFlywheel' as const,
      descKey: 'contentFlywheelDesc' as const,
      icon: FileText,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      nameKey: 'amplificationEngine' as const,
      descKey: 'amplificationEngineDesc' as const,
      icon: Megaphone,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      nameKey: 'opportunityHunter' as const,
      descKey: 'opportunityHunterDesc' as const,
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
  ];

  const quickStats = [
    {
      label: t('contentsPublished'),
      value: kpi?.contentsPublished?.toLocaleString() ?? '\u2014',
      spark: kpi?.sparklines?.contents,
      color: '#6366f1',
    },
    {
      label: t('leadsGenerated'),
      value: kpi?.leadsGenerated?.toLocaleString() ?? '\u2014',
      spark: kpi?.sparklines?.leads,
      color: '#10b981',
    },
    {
      label: t('avgROAS'),
      value: kpi?.avgROAS ? `${kpi.avgROAS.toFixed(1)}x` : '\u2014',
      spark: kpi?.sparklines?.roas,
      color: '#f59e0b',
    },
    {
      label: t('engagementRate'),
      value: kpi?.engagementRate ? `${(kpi.engagementRate * 100).toFixed(1)}%` : '\u2014',
      spark: kpi?.sparklines?.engagement,
      color: '#ef4444',
    },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
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

      <div>
        <h2 className="mb-4 text-xl font-semibold">{t('aiAgents')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {agentCards.map((agent) => (
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
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t('pending')}
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
