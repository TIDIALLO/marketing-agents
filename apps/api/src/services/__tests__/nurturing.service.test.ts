import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

const mockPrisma = {
  lead: { findFirst: vi.fn(), update: vi.fn() },
  leadSequence: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  leadSequenceEnrollment: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  leadInteraction: { findMany: vi.fn(), create: vi.fn() },
  platformUser: { findFirst: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({ claudeGenerate: vi.fn().mockResolvedValue('Personalized follow-up message') }));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/socket', () => ({ emitEvent: vi.fn() }));
vi.mock('../../lib/redis', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/n8n', () => ({ triggerWorkflow: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('../../lib/email', () => ({
  sendNurturingEmail: vi.fn().mockResolvedValue(undefined),
  sendEscalationEmail: vi.fn().mockResolvedValue(undefined),
}));

const nurturingService = await import('../nurturing.service');

const mockLead = {
  id: 'lead-1', brandId: 'brand-1', firstName: 'Jean', lastName: 'Dupont',
  email: 'jean@test.com', phone: '+33612345678', company: 'TechCorp',
  score: 60, temperature: 'warm', status: 'nurturing', source: 'form',
  interactions: [],
};
const mockSequence = {
  id: 'seq-1', name: 'Nurture Sequence',
  steps: [{ order: 0, channel: 'email', delayHours: 24, bodyPrompt: 'Follow up' }],
};

describe('nurturing.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createSequence', () => {
    it('should create sequence', async () => {
      mockPrisma.leadSequence.create.mockResolvedValue(mockSequence);
      const result = await nurturingService.createSequence({ name: 'Test', steps: [] });
      expect(result.name).toBe('Nurture Sequence');
    });
  });

  describe('listSequences', () => {
    it('should list sequences with enrollment counts', async () => {
      mockPrisma.leadSequence.findMany.mockResolvedValue([mockSequence]);
      const result = await nurturingService.listSequences();
      expect(result).toHaveLength(1);
    });
  });

  describe('getSequenceById', () => {
    it('should throw NOT_FOUND', async () => {
      mockPrisma.leadSequence.findFirst.mockResolvedValue(null);
      await expect(nurturingService.getSequenceById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('enrollLead', () => {
    it('should enroll lead in sequence', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.leadSequence.findFirst.mockResolvedValue(mockSequence);
      mockPrisma.leadSequenceEnrollment.create.mockResolvedValue({ id: 'lse-1', status: 'active', currentStep: 0 });

      const result = await nurturingService.enrollLead('lead-1', 'seq-1');
      expect(result.status).toBe('active');
    });

    it('should throw NOT_FOUND for missing lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(nurturingService.enrollLead('x', 'y')).rejects.toThrow(AppError);
    });
  });

  describe('executeFollowUps', () => {
    it('should send email follow-ups for due enrollments', async () => {
      mockPrisma.leadSequenceEnrollment.findMany.mockResolvedValue([{
        id: 'lse-1', currentStep: 0, lead: mockLead, sequence: mockSequence,
      }]);
      mockPrisma.leadInteraction.findMany.mockResolvedValue([]);
      mockPrisma.leadInteraction.create.mockResolvedValue({});
      mockPrisma.leadSequenceEnrollment.update.mockResolvedValue({});

      const results = await nurturingService.executeFollowUps();

      expect(results).toHaveLength(1);
      expect(results[0].sent).toBe(true);
      const { sendNurturingEmail } = await import('../../lib/email');
      expect(sendNurturingEmail).toHaveBeenCalledOnce();
    });

    it('should complete enrollment when all steps done', async () => {
      mockPrisma.leadSequenceEnrollment.findMany.mockResolvedValue([{
        id: 'lse-1', currentStep: 1, lead: mockLead,
        sequence: { ...mockSequence, steps: [mockSequence.steps[0]] }, // only 1 step, at index 1
      }]);
      mockPrisma.leadSequenceEnrollment.update.mockResolvedValue({});

      const results = await nurturingService.executeFollowUps();
      expect(results[0].sent).toBe(false);
    });
  });

  describe('analyzeResponse', () => {
    it('should analyze inbound response and create interaction', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce(JSON.stringify({
        sentiment: 'positive', intent: 'interested', objectionCategory: null,
        temperatureChange: 'hot', reasoning: 'Lead is engaged', suggestedAction: 'Book call', urgency: 'medium',
      }));
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.leadInteraction.findMany.mockResolvedValue([]);
      mockPrisma.leadInteraction.create.mockResolvedValue({ id: 'li-1' });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, temperature: 'hot' });

      const result = await nurturingService.analyzeResponse('lead-1', { channel: 'email', content: 'Very interested!' });

      expect(result.analysis.sentiment).toBe('positive');
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { temperature: 'hot' },
      });
    });
  });

  describe('escalateToHuman', () => {
    it('should escalate lead and notify via Slack', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ ...mockLead, interactions: [] });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, status: 'opportunity' });
      mockPrisma.leadSequenceEnrollment.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.platformUser.findFirst.mockResolvedValue({ email: 'sales@test.com' });
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('## Summary\nHot lead ready for call');

      const result = await nurturingService.escalateToHuman('lead-1', 'user-1', 'Ready to buy');

      expect(result.summary).toContain('Summary');
      const { sendSlackNotification } = await import('../../lib/slack');
      expect(sendSlackNotification).toHaveBeenCalled();
    });
  });

  describe('trackConversion', () => {
    it('should track conversion and publish event', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ ...mockLead, interactions: [{ channel: 'email', createdAt: new Date() }] });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, status: 'converted', conversionValue: 999 });
      mockPrisma.leadSequenceEnrollment.updateMany.mockResolvedValue({ count: 0 });

      const result = await nurturingService.trackConversion('lead-1', { conversionValue: 999 });

      expect(result.attribution.touchpoints).toBe(1);
      expect(result.attribution.valuePerTouch).toBe(999);
      const { publishEvent } = await import('../../lib/redis');
      expect(publishEvent).toHaveBeenCalledWith('mkt:agent:3:conversion', expect.any(Object));
    });
  });
});
