import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendSlackNotification } from '../lib/slack';

// ─── Workflow Error Logging (Story 10.8) ─────────────────────────

export async function logWorkflowError(data: {
  workflowId: string;
  workflowName?: string;
  nodeName?: string;
  errorMessage: string;
  errorStack?: string;
  payload?: Record<string, unknown>;
}) {
  const error = await prisma.workflowError.create({
    data: {
      workflowId: data.workflowId,
      workflowName: data.workflowName ?? null,
      nodeName: data.nodeName ?? null,
      errorMessage: data.errorMessage,
      errorStack: data.errorStack ?? null,
      payload: data.payload ? (data.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  // Notify admin
  await sendSlackNotification({
    text: `[ERROR] Workflow ${data.workflowName ?? data.workflowId} failed at node "${data.nodeName ?? 'unknown'}": ${data.errorMessage}`,
  });

  return error;
}

// ─── Agent Health Check ──────────────────────────────────────────

interface AgentHealth {
  agent: string;
  lastActivity: Date | null;
  maxAllowedHours: number;
  healthy: boolean;
  hoursInactive: number | null;
}

export async function getSystemHealth() {
  const now = new Date();

  // Agent 1 (Content Flywheel): should run within 24h
  const lastContentActivity = await prisma.contentPiece.findFirst({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    select: { publishedAt: true },
  });

  // Agent 2 (Amplification Engine): should run within 48h
  const lastAdActivity = await prisma.adCampaign.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  // Agent 3 (Opportunity Hunter): first contact should be < 1h
  const lastLeadActivity = await prisma.lead.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  const agents: AgentHealth[] = [
    {
      agent: 'Content Flywheel (Agent 1)',
      lastActivity: lastContentActivity?.publishedAt ?? null,
      maxAllowedHours: 24,
      healthy: lastContentActivity?.publishedAt
        ? (now.getTime() - lastContentActivity.publishedAt.getTime()) < 24 * 3600_000
        : false,
      hoursInactive: lastContentActivity?.publishedAt
        ? Math.round((now.getTime() - lastContentActivity.publishedAt.getTime()) / 3600_000)
        : null,
    },
    {
      agent: 'Amplification Engine (Agent 2)',
      lastActivity: lastAdActivity?.updatedAt ?? null,
      maxAllowedHours: 48,
      healthy: lastAdActivity?.updatedAt
        ? (now.getTime() - lastAdActivity.updatedAt.getTime()) < 48 * 3600_000
        : false,
      hoursInactive: lastAdActivity?.updatedAt
        ? Math.round((now.getTime() - lastAdActivity.updatedAt.getTime()) / 3600_000)
        : null,
    },
    {
      agent: 'Opportunity Hunter (Agent 3)',
      lastActivity: lastLeadActivity?.updatedAt ?? null,
      maxAllowedHours: 1,
      healthy: lastLeadActivity?.updatedAt
        ? (now.getTime() - lastLeadActivity.updatedAt.getTime()) < 3600_000
        : false,
      hoursInactive: lastLeadActivity?.updatedAt
        ? Math.round((now.getTime() - lastLeadActivity.updatedAt.getTime()) / 3600_000)
        : null,
    },
  ];

  // Redis message stats
  const [totalMessages, unconsumedMessages, unconsumedByChannel] = await Promise.all([
    prisma.agentMessage.count(),
    prisma.agentMessage.count({ where: { consumed: false } }),
    prisma.agentMessage.groupBy({
      by: ['channel'],
      where: { consumed: false },
      _count: true,
    }),
  ]);

  const messageLevel = unconsumedMessages >= 20 ? 'critical' : unconsumedMessages >= 5 ? 'warning' : 'ok';

  // Recent workflow errors (last 24h)
  const recentErrors = await prisma.workflowError.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 24 * 3600_000) } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const overallHealthy = agents.every((a) => a.healthy) && messageLevel !== 'critical' && recentErrors.length === 0;

  return {
    status: overallHealthy ? 'healthy' : 'degraded',
    timestamp: now.toISOString(),
    agents,
    messages: {
      total: totalMessages,
      unconsumed: unconsumedMessages,
      level: messageLevel,
      byChannel: unconsumedByChannel.map((c) => ({ channel: c.channel, count: c._count })),
    },
    recentErrors: recentErrors.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
      workflowName: e.workflowName,
      nodeName: e.nodeName,
      errorMessage: e.errorMessage,
      createdAt: e.createdAt,
    })),
  };
}

// ─── Error List (admin) ──────────────────────────────────────────

export async function listWorkflowErrors(filters?: {
  workflowId?: string;
  from?: Date;
  limit?: number;
}) {
  return prisma.workflowError.findMany({
    where: {
      ...(filters?.workflowId ? { workflowId: filters.workflowId } : {}),
      ...(filters?.from ? { createdAt: { gte: filters.from } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
  });
}
