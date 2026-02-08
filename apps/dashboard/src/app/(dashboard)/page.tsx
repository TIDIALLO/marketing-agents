'use client';

import { useAuth } from '@/providers/AuthProvider';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { FileText, Megaphone, Users, TrendingUp } from 'lucide-react';

const agentCards = [
  {
    name: 'Content Flywheel',
    description: 'Création et publication de contenu IA',
    icon: FileText,
    status: 'En attente',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    name: 'Amplification Engine',
    description: 'Campagnes publicitaires automatisées',
    icon: Megaphone,
    status: 'En attente',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    name: 'Opportunity Hunter',
    description: 'Capture et qualification de leads',
    icon: Users,
    status: 'En attente',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
];

const quickStats = [
  { label: 'Contenus publiés', value: '—', change: '' },
  { label: 'Leads générés', value: '—', change: '' },
  { label: 'ROAS moyen', value: '—', change: '' },
  { label: 'Engagement rate', value: '—', change: '' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue, {user?.firstName} !
        </h1>
        <p className="text-muted-foreground">
          Voici un aperçu de votre activité marketing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              {stat.change && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Agents IA</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {agentCards.map((agent) => (
            <Card key={agent.name}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${agent.bg}`}
                >
                  <agent.icon className={`h-5 w-5 ${agent.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {agent.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {agent.status}
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
