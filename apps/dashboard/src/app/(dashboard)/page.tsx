'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { FileText, Megaphone, Users } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const tAgents = useTranslations('agents');

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
    { label: t('contentsPublished'), value: '\u2014' },
    { label: t('leadsGenerated'), value: '\u2014' },
    { label: t('avgROAS'), value: '\u2014' },
    { label: t('engagementRate'), value: '\u2014' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('welcome', { firstName: user?.firstName ?? '' })}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
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
