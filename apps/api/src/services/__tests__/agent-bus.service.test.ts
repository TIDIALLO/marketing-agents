import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  agentMessage: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
};

vi.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../lib/redis', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/slack', () => ({
  sendSlackNotification: vi.fn().mockResolvedValue(true),
}));

const agentBus = await import('../agent-bus.service');

describe('agent-bus.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishPersistentMessage', () => {
    it('should persist message to DB and publish to Redis', async () => {
      const mockMsg = { id: 'msg-1', channel: 'content:signal', payload: { test: true } };
      mockPrisma.agentMessage.create.mockResolvedValue(mockMsg);

      const result = await agentBus.publishPersistentMessage('content:signal', { test: true }, 'corr-1');

      expect(mockPrisma.agentMessage.create).toHaveBeenCalledWith({
        data: {
          channel: 'content:signal',
          payload: { test: true },
          correlationId: 'corr-1',
        },
      });
      expect(result).toEqual(mockMsg);

      const { publishEvent } = await import('../../lib/redis');
      expect(publishEvent).toHaveBeenCalledWith('content:signal', {
        test: true,
        _messageId: 'msg-1',
      });
    });

    it('should handle null correlationId', async () => {
      mockPrisma.agentMessage.create.mockResolvedValue({ id: 'msg-2' });

      await agentBus.publishPersistentMessage('leads:new', { leadId: 'l-1' });

      expect(mockPrisma.agentMessage.create).toHaveBeenCalledWith({
        data: {
          channel: 'leads:new',
          payload: { leadId: 'l-1' },
          correlationId: null,
        },
      });
    });
  });

  describe('consumeMessage', () => {
    it('should mark message as consumed', async () => {
      mockPrisma.agentMessage.update.mockResolvedValue({ id: 'msg-1', consumed: true });

      const result = await agentBus.consumeMessage('msg-1', 'agent-flywheel');

      expect(mockPrisma.agentMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: {
          consumed: true,
          consumedAt: expect.any(Date),
          consumedBy: 'agent-flywheel',
        },
      });
      expect(result.consumed).toBe(true);
    });
  });

  describe('processDLQ', () => {
    it('should re-publish unconsumed messages and increment retry count', async () => {
      const stuckMsg = {
        id: 'msg-old',
        channel: 'content:signal',
        payload: { data: 'old' },
        retryCount: 1,
        consumed: false,
      };
      mockPrisma.agentMessage.findMany.mockResolvedValue([stuckMsg]);
      mockPrisma.agentMessage.update.mockResolvedValue({});

      const result = await agentBus.processDLQ();

      expect(result.processed).toBe(1);
      expect(mockPrisma.agentMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-old' },
        data: { retryCount: { increment: 1 } },
      });
    });

    it('should return 0 processed when no stuck messages', async () => {
      mockPrisma.agentMessage.findMany.mockResolvedValue([]);

      const result = await agentBus.processDLQ();

      expect(result.processed).toBe(0);
      expect(result.level).toBe('ok');
    });
  });

  describe('getMessageStats', () => {
    it('should return message statistics', async () => {
      mockPrisma.agentMessage.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(3);  // unconsumed
      mockPrisma.agentMessage.groupBy.mockResolvedValue([
        { channel: 'content:signal', _count: 2 },
      ]);

      const stats = await agentBus.getMessageStats();

      expect(stats.total).toBe(100);
      expect(stats.unconsumed).toBe(3);
      expect(stats.level).toBe('ok');
      expect(stats.byChannel).toHaveLength(1);
    });

    it('should return warning level when unconsumed >= 5', async () => {
      mockPrisma.agentMessage.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(7);
      mockPrisma.agentMessage.groupBy.mockResolvedValue([]);

      const stats = await agentBus.getMessageStats();
      expect(stats.level).toBe('warning');
    });

    it('should return critical level when unconsumed >= 20', async () => {
      mockPrisma.agentMessage.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(25);
      mockPrisma.agentMessage.groupBy.mockResolvedValue([]);

      const stats = await agentBus.getMessageStats();
      expect(stats.level).toBe('critical');
    });
  });
});
