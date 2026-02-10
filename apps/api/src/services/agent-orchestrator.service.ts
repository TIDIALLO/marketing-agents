import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';
import { emitEvent } from '../lib/socket';
import { consumeMessage } from './agent-bus.service';

// ─── Agent Orchestrator ─────────────────────────────────────
// Subscribes to Redis channels and routes events to agent handlers.
// Each handler represents an autonomous agent decision.

type AgentHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Map<string, AgentHandler[]> = new Map();

function on(channel: string, handler: AgentHandler) {
  const existing = handlers.get(channel) ?? [];
  existing.push(handler);
  handlers.set(channel, existing);
}

// ─── Agent Action Logging ────────────────────────────────────

async function logAction(params: {
  agentType: string;
  actionType: string;
  entityType: string;
  entityId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  outcome: string;
}) {
  await prisma.aiLearningLog.create({
    data: {
      agentType: params.agentType,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      input: params.input as Prisma.InputJsonValue,
      output: params.output as Prisma.InputJsonValue,
      outcome: params.outcome,
    },
  });
}

// ─── Event Handlers (Agent 1: Content Flywheel) ─────────────

on('mkt:agent:1:content_published', async (payload) => {
  const pieceId = payload.contentPieceId as string;
  if (!pieceId) return;

  // Schedule metrics collection at 1h, 24h, 48h, 7d
  await logAction({
    agentType: 'content_flywheel',
    actionType: 'schedule_metrics',
    entityType: 'content_piece',
    entityId: pieceId,
    input: payload,
    output: { scheduled: true, intervals: [1, 24, 48, 168] },
    outcome: 'scheduled',
  });

  emitEvent('agent:action', {
    agent: 'content_flywheel',
    action: 'metrics_scheduled',
    entityId: pieceId,
  });
});

on('mkt:agent:1:signal_detected', async (payload) => {
  const signalId = payload.signalId as string;
  const score = payload.score as number;
  if (!signalId) return;

  // High-signal content → trigger amplification agent
  if (score >= 80) {
    const { amplifyWinningContent } = await import('./feedback-loop.service');
    try {
      const result = await amplifyWinningContent(signalId);
      await logAction({
        agentType: 'content_flywheel',
        actionType: 'auto_amplify',
        entityType: 'content_signal',
        entityId: signalId,
        input: payload,
        output: { amplified: !!result, campaignId: result?.campaignId ?? null },
        outcome: result ? 'amplified' : 'skipped',
      });
    } catch (err) {
      console.error('[Orchestrator] Auto-amplify failed:', err);
    }
  }
});

// ─── Event Handlers (Agent 2: Amplification Engine) ──────────

on('mkt:agent:2:amplification', async (payload) => {
  await logAction({
    agentType: 'amplification_engine',
    actionType: 'campaign_created',
    entityType: 'ad_campaign',
    entityId: (payload.campaignId as string) ?? 'unknown',
    input: payload,
    output: { action: payload.action },
    outcome: 'success',
  });
});

on('mkt:agent:2:performance', async (payload) => {
  // Ad insights fed back to content → log learning
  await logAction({
    agentType: 'amplification_engine',
    actionType: 'insight_extracted',
    entityType: 'creative_insight',
    entityId: `insight_${Date.now()}`,
    input: payload,
    output: { insightCount: payload.insightCount, contentInputsCreated: payload.contentInputsCreated },
    outcome: 'learned',
  });
});

// ─── Event Handlers (Agent 3: Opportunity Hunter) ────────────

on('mkt:agent:3:new_lead', async (payload) => {
  const leadId = payload.leadId as string;
  const temperature = payload.temperature as string;
  if (!leadId) return;

  // Auto-enroll warm+ leads into nurturing sequence
  if (temperature === 'warm' || temperature === 'hot') {
    const defaultSequence = await prisma.leadSequence.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (defaultSequence) {
      const existing = await prisma.leadSequenceEnrollment.findFirst({
        where: { leadId, status: 'active' },
      });

      if (!existing) {
        const { enrollLead } = await import('./nurturing.service');
        await enrollLead(leadId, defaultSequence.id);
        await logAction({
          agentType: 'opportunity_hunter',
          actionType: 'auto_enroll',
          entityType: 'lead',
          entityId: leadId,
          input: payload,
          output: { sequenceId: defaultSequence.id, sequenceName: defaultSequence.name },
          outcome: 'enrolled',
        });
      }
    }
  }
});

on('mkt:agent:3:objection', async (payload) => {
  // Track objection for compound learning
  await logAction({
    agentType: 'opportunity_hunter',
    actionType: 'objection_tracked',
    entityType: 'lead',
    entityId: (payload.leadId as string) ?? 'unknown',
    input: payload,
    output: { category: payload.category },
    outcome: 'tracked',
  });
});

on('mkt:agent:3:conversion', async (payload) => {
  // Conversion → analyze what worked for compound learning
  await logAction({
    agentType: 'opportunity_hunter',
    actionType: 'conversion',
    entityType: 'lead',
    entityId: (payload.leadId as string) ?? 'unknown',
    input: payload,
    output: {
      conversionValue: payload.conversionValue,
      touchpoints: payload.touchpoints,
      source: payload.source,
    },
    outcome: 'converted',
  });
});

// ─── Event Handlers (System: Learning Loop) ──────────────────

on('mkt:agent:learning:updated', async (payload) => {
  emitEvent('agent:learning', {
    insightCount: payload.insightCount,
    summary: payload.summary,
  });
});

on('mkt:agent:3:objection_briefs', async (payload) => {
  await logAction({
    agentType: 'system',
    actionType: 'objection_to_content',
    entityType: 'content_brief',
    entityId: `brief_${Date.now()}`,
    input: payload,
    output: { contentBriefsCreated: payload.contentBriefsCreated },
    outcome: 'briefs_created',
  });
});

on('mkt:agent:2:crossref', async (payload) => {
  await logAction({
    agentType: 'amplification_engine',
    actionType: 'signal_crossref',
    entityType: 'attribution',
    entityId: `crossref_${Date.now()}`,
    input: payload,
    output: { attributions: payload.attributions, patterns: payload.patterns },
    outcome: 'analyzed',
  });
});

// ─── Start Orchestrator (Redis subscriber) ───────────────────

let subscriber: ReturnType<typeof getRedis> | null = null;

export async function startOrchestrator() {
  try {
    subscriber = getRedis().duplicate();

    // Subscribe to all agent channels
    const channels = Array.from(handlers.keys());
    if (channels.length === 0) {
      console.log('[Orchestrator] No channels to subscribe to');
      return;
    }

    await subscriber.subscribe(...channels);
    console.log(`[Orchestrator] Subscribed to ${channels.length} channels: ${channels.join(', ')}`);

    subscriber.on('message', async (channel, message) => {
      const channelHandlers = handlers.get(channel);
      if (!channelHandlers) return;

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(message);
      } catch {
        console.error(`[Orchestrator] Invalid message on ${channel}:`, message);
        return;
      }

      // Mark message as consumed in DB if it has a _messageId
      const messageId = payload._messageId as string | undefined;
      if (messageId) {
        consumeMessage(messageId, 'orchestrator').catch(() => {});
      }

      // Execute all handlers for this channel
      for (const handler of channelHandlers) {
        try {
          await handler(payload);
        } catch (err) {
          console.error(`[Orchestrator] Handler error on ${channel}:`, err);
        }
      }
    });
  } catch (err) {
    console.error('[Orchestrator] Failed to start:', err);
  }
}

export async function stopOrchestrator() {
  if (subscriber) {
    await subscriber.unsubscribe();
    subscriber.disconnect();
    subscriber = null;
  }
}

// ─── Agent Stats ─────────────────────────────────────────────

export async function getAgentStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000);

  const [byAgent, byAction, recentActions] = await Promise.all([
    prisma.aiLearningLog.groupBy({
      by: ['agentType'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
    }),
    prisma.aiLearningLog.groupBy({
      by: ['agentType', 'actionType'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
    }),
    prisma.aiLearningLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        agentType: true,
        actionType: true,
        entityType: true,
        outcome: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    subscribedChannels: Array.from(handlers.keys()),
    agentActivity: byAgent.map((a) => ({ agent: a.agentType, actions: a._count })),
    actionBreakdown: byAction.map((a) => ({
      agent: a.agentType,
      action: a.actionType,
      count: a._count,
    })),
    recentActions,
  };
}
