import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { publishEvent } from '../lib/redis';
import { sendSlackNotification } from '../lib/slack';

// ─── Persistent Message Publishing (Story 10.2) ─────────────────

export async function publishPersistentMessage(
  channel: string,
  payload: Record<string, unknown>,
  correlationId?: string,
) {
  // Persist to DB
  const msg = await prisma.agentMessage.create({
    data: {
      channel,
      payload: payload as Prisma.InputJsonValue,
      correlationId: correlationId ?? null,
    },
  });

  // Publish to Redis
  await publishEvent(channel, { ...payload, _messageId: msg.id });

  return msg;
}

// ─── Mark Message as Consumed ────────────────────────────────────

export async function consumeMessage(messageId: string, consumedBy: string) {
  return prisma.agentMessage.update({
    where: { id: messageId },
    data: { consumed: true, consumedAt: new Date(), consumedBy },
  });
}

// ─── Dead Letter Queue Processing ────────────────────────────────

export async function processDLQ() {
  const cutoff = new Date(Date.now() - 24 * 3600_000);

  const unconsumed = await prisma.agentMessage.findMany({
    where: {
      consumed: false,
      createdAt: { lt: cutoff },
      retryCount: { lt: 3 },
    },
    orderBy: { createdAt: 'asc' },
  });

  const results: { id: string; retried: boolean; channel: string }[] = [];

  for (const msg of unconsumed) {
    // Re-publish to Redis
    const payload = msg.payload as Record<string, unknown>;
    await publishEvent(msg.channel, { ...payload, _messageId: msg.id, _retry: msg.retryCount + 1 });

    await prisma.agentMessage.update({
      where: { id: msg.id },
      data: { retryCount: { increment: 1 } },
    });

    results.push({ id: msg.id, retried: true, channel: msg.channel });
  }

  // Notify admin if there are stuck messages
  if (unconsumed.length > 0) {
    const level = unconsumed.length >= 20 ? 'CRITICAL' : unconsumed.length >= 5 ? 'WARNING' : 'INFO';
    await sendSlackNotification({
      text: `[${level}] ${unconsumed.length} messages non consommés depuis 24h — ${results.length} relancés`,
    });
  }

  return { processed: results.length, level: unconsumed.length >= 20 ? 'critical' : unconsumed.length >= 5 ? 'warning' : 'ok' };
}

// ─── List Messages (admin) ───────────────────────────────────────

export async function listMessages(filters?: {
  channel?: string;
  consumed?: boolean;
  limit?: number;
}) {
  return prisma.agentMessage.findMany({
    where: {
      ...(filters?.channel ? { channel: filters.channel } : {}),
      ...(filters?.consumed !== undefined ? { consumed: filters.consumed } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
  });
}

// ─── Message Stats ───────────────────────────────────────────────

export async function getMessageStats() {
  const [total, unconsumed, channelStats] = await Promise.all([
    prisma.agentMessage.count(),
    prisma.agentMessage.count({ where: { consumed: false } }),
    prisma.agentMessage.groupBy({
      by: ['channel'],
      _count: true,
      where: { consumed: false },
    }),
  ]);

  return {
    total,
    unconsumed,
    level: unconsumed >= 20 ? 'critical' : unconsumed >= 5 ? 'warning' : 'ok',
    byChannel: channelStats.map((c) => ({ channel: c.channel, unconsumed: c._count })),
  };
}
