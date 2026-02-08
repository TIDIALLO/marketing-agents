import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  contentPiece: { findFirst: vi.fn() },
  adCampaign: { findFirst: vi.fn() },
  lead: { findFirst: vi.fn() },
  agentMessage: { count: vi.fn(), groupBy: vi.fn() },
  workflowError: { create: vi.fn(), findMany: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../lib/slack', () => ({
  sendSlackNotification: vi.fn().mockResolvedValue(true),
}));

const { logWorkflowError, getSystemHealth, listWorkflowErrors } = await import('../monitoring.service');

describe('monitoring.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logWorkflowError', () => {
    it('should persist error and notify via Slack', async () => {
      const mockError = { id: 'err-1', workflowId: 'wf-1' };
      mockPrisma.workflowError.create.mockResolvedValue(mockError);

      const result = await logWorkflowError({
        workflowId: 'wf-1',
        workflowName: 'Content Pipeline',
        nodeName: 'AI Generate',
        errorMessage: 'Claude API timeout',
      });

      expect(result).toEqual(mockError);
      expect(mockPrisma.workflowError.create).toHaveBeenCalledOnce();

      const { sendSlackNotification } = await import('../../lib/slack');
      expect(sendSlackNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Content Pipeline'),
        }),
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should return degraded when no activity', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      mockPrisma.adCampaign.findFirst.mockResolvedValue(null);
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.agentMessage.count.mockResolvedValue(0);
      mockPrisma.agentMessage.groupBy.mockResolvedValue([]);
      mockPrisma.workflowError.findMany.mockResolvedValue([]);

      const health = await getSystemHealth();

      expect(health.status).toBe('degraded');
      expect(health.agents).toHaveLength(3);
      expect(health.agents[0]!.healthy).toBe(false);
      expect(health.agents[1]!.healthy).toBe(false);
      expect(health.agents[2]!.healthy).toBe(false);
    });

    it('should return healthy when all agents have recent activity', async () => {
      const now = new Date();
      mockPrisma.contentPiece.findFirst.mockResolvedValue({ publishedAt: now });
      mockPrisma.adCampaign.findFirst.mockResolvedValue({ updatedAt: now });
      mockPrisma.lead.findFirst.mockResolvedValue({ updatedAt: now });
      mockPrisma.agentMessage.count.mockResolvedValue(0);
      mockPrisma.agentMessage.groupBy.mockResolvedValue([]);
      mockPrisma.workflowError.findMany.mockResolvedValue([]);

      const health = await getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.agents.every((a) => a.healthy)).toBe(true);
    });

    it('should report critical message level', async () => {
      const now = new Date();
      mockPrisma.contentPiece.findFirst.mockResolvedValue({ publishedAt: now });
      mockPrisma.adCampaign.findFirst.mockResolvedValue({ updatedAt: now });
      mockPrisma.lead.findFirst.mockResolvedValue({ updatedAt: now });
      mockPrisma.agentMessage.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(25);
      mockPrisma.agentMessage.groupBy.mockResolvedValue([]);
      mockPrisma.workflowError.findMany.mockResolvedValue([]);

      const health = await getSystemHealth();

      expect(health.status).toBe('degraded');
      expect(health.messages.level).toBe('critical');
    });
  });

  describe('listWorkflowErrors', () => {
    it('should list errors with default limit', async () => {
      mockPrisma.workflowError.findMany.mockResolvedValue([]);

      await listWorkflowErrors();

      expect(mockPrisma.workflowError.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter by workflowId', async () => {
      mockPrisma.workflowError.findMany.mockResolvedValue([]);

      await listWorkflowErrors({ workflowId: 'wf-1', limit: 10 });

      expect(mockPrisma.workflowError.findMany).toHaveBeenCalledWith({
        where: { workflowId: 'wf-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });
});
