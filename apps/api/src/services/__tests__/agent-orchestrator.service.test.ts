import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  aiLearningLog: { create: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  leadSequence: { findFirst: vi.fn() },
  leadSequenceEnrollment: { findFirst: vi.fn() },
  agentMessage: { create: vi.fn(), update: vi.fn() },
};

const mockRedisClient = {
  subscribe: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/redis', () => ({
  getRedis: vi.fn().mockReturnValue({ duplicate: () => mockRedisClient }),
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../lib/socket', () => ({ emitEvent: vi.fn() }));
vi.mock('../feedback-loop.service', () => ({ amplifyWinningContent: vi.fn().mockResolvedValue(null) }));
vi.mock('../nurturing.service', () => ({ enrollLead: vi.fn().mockResolvedValue({ id: 'lse-1' }) }));

const orchestratorService = await import('../agent-orchestrator.service');

describe('agent-orchestrator.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getAgentStats', () => {
    it('should return agent activity statistics', async () => {
      mockPrisma.aiLearningLog.groupBy.mockResolvedValue([
        { agentType: 'content_flywheel', _count: 5 },
      ]);
      mockPrisma.aiLearningLog.findMany.mockResolvedValue([
        { agentType: 'content_flywheel', actionType: 'generate', entityType: 'content_piece', outcome: 'published', createdAt: new Date() },
      ]);

      const stats = await orchestratorService.getAgentStats();

      expect(stats.subscribedChannels).toBeDefined();
      expect(stats.recentActions).toHaveLength(1);
    });
  });

  describe('startOrchestrator / stopOrchestrator', () => {
    it('should start and stop without errors', async () => {
      await orchestratorService.startOrchestrator();
      expect(mockRedisClient.subscribe).toHaveBeenCalled();

      await orchestratorService.stopOrchestrator();
      expect(mockRedisClient.unsubscribe).toHaveBeenCalled();
    });
  });
});
