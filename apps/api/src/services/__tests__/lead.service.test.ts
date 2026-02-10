import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  lead: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  calendarBooking: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  platformUser: { findFirst: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    score: 75, temperature: 'hot', reasoning: 'Good profile', painPoints: ['security'], suggestedProduct: 'SOC Hub',
  })),
}));
vi.mock('../../lib/redis', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/socket', () => ({ emitEvent: vi.fn() }));
vi.mock('../../lib/n8n', () => ({ triggerWorkflow: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('../../lib/email', () => ({ sendLeadProposalEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/calcom', () => ({
  getAvailableSlots: vi.fn().mockResolvedValue([
    { date: '2025-02-01', time: '10:00', isoDateTime: '2025-02-01T10:00:00Z' },
  ]),
  createBooking: vi.fn().mockResolvedValue({ uid: 'cal-123' }),
}));

const leadService = await import('../lead.service');

const mockLead = {
  id: 'lead-1', brandId: 'brand-1', firstName: 'Jean', lastName: 'Dupont',
  email: 'jean@example.com', phone: '+33612345678', company: 'TechCorp',
  source: 'form', sourceDetail: null, utmSource: null, utmMedium: null, utmCampaign: null,
  score: 75, temperature: 'hot', status: 'qualified', gdprConsent: true,
  assignedTo: null, convertedAt: null, conversionValue: null,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('lead.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('ingestLead', () => {
    it('should create new lead when no duplicate exists', async () => {
      mockPrisma.lead.findFirst
        .mockResolvedValueOnce(null)  // dedup check
        .mockResolvedValueOnce(mockLead); // scoreLead
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(mockLead);

      const result = await leadService.ingestLead({
        brandId: 'brand-1', firstName: 'Jean', lastName: 'Dupont', email: 'Jean@Example.com',
      });

      expect(result.id).toBe('lead-1');
      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'jean@example.com' }),
      });
    });

    it('should merge existing lead on duplicate email', async () => {
      mockPrisma.lead.findFirst
        .mockResolvedValueOnce(mockLead)  // dedup: found
        .mockResolvedValueOnce(mockLead); // scoreLead
      mockPrisma.lead.update.mockResolvedValue(mockLead);

      const result = await leadService.ingestLead({
        brandId: 'brand-1', firstName: 'Jean', lastName: 'Dupont',
        email: 'jean@example.com', company: 'NewCorp',
      });

      expect(mockPrisma.lead.update).toHaveBeenCalled();
      expect(result.id).toBe('lead-1');
    });

    it('should normalize email to lowercase', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(mockLead);

      await leadService.ingestLead({
        brandId: 'brand-1', firstName: 'J', lastName: 'D', email: '  JEAN@EXAMPLE.COM  ',
      });

      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'jean@example.com' }),
      });
    });
  });

  describe('scoreLead', () => {
    it('should score lead with AI and publish events', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, score: 75, temperature: 'hot' });

      const result = await leadService.scoreLead('lead-1');

      expect(result.analysis.score).toBe(75);
      const { publishEvent } = await import('../../lib/redis');
      expect(publishEvent).toHaveBeenCalledWith('mkt:agent:3:new_lead', expect.any(Object));
      const { emitEvent } = await import('../../lib/socket');
      expect(emitEvent).toHaveBeenCalledWith('lead:qualified', expect.any(Object));
    });

    it('should trigger auto-booking for hot leads', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, score: 75, temperature: 'hot' });

      await leadService.scoreLead('lead-1');

      const { triggerWorkflow } = await import('../../lib/n8n');
      expect(triggerWorkflow).toHaveBeenCalledWith('mkt-305', expect.objectContaining({ leadId: 'lead-1' }));
    });

    it('should throw NOT_FOUND for missing lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(leadService.scoreLead('missing')).rejects.toThrow(AppError);
    });
  });

  describe('createBookingProposal', () => {
    it('should create booking with proposed slots and send email', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.calendarBooking.create.mockResolvedValue({ id: 'cb-1', status: 'pending' });
      // claudeGenerate already mocked for proposal message
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('Bonjour Jean, proposons un RDV...');

      const result = await leadService.createBookingProposal('lead-1');

      expect(result.status).toBe('pending');
      const { sendLeadProposalEmail } = await import('../../lib/email');
      expect(sendLeadProposalEmail).toHaveBeenCalledWith('jean@example.com', expect.any(Object));
    });

    it('should throw NOT_FOUND for missing lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(leadService.createBookingProposal('missing')).rejects.toThrow(AppError);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm booking with Cal.com and update lead status', async () => {
      const mockBooking = {
        id: 'cb-1', leadId: 'lead-1', status: 'pending',
        proposedSlots: [{ date: '2025-02-01', time: '10:00', isoDateTime: '2025-02-01T10:00:00Z' }],
        lead: mockLead,
      };
      mockPrisma.calendarBooking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.calendarBooking.update.mockResolvedValue({ ...mockBooking, status: 'confirmed' });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, status: 'opportunity' });

      const result = await leadService.confirmBooking('cb-1', 0);

      expect(result.status).toBe('confirmed');
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { status: 'opportunity' },
      });
    });

    it('should throw VALIDATION_ERROR for invalid slot index', async () => {
      const mockBooking = {
        id: 'cb-1', leadId: 'lead-1', status: 'pending', proposedSlots: [], lead: mockLead,
      };
      mockPrisma.calendarBooking.findFirst.mockResolvedValue(mockBooking);

      try {
        await leadService.confirmBooking('cb-1', 5);
      } catch (err) {
        expect((err as AppError).code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('listLeads', () => {
    it('should filter by temperature', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      await leadService.listLeads({ temperature: 'hot' });
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ temperature: 'hot' }) }),
      );
    });
  });

  describe('getPipelineFunnel', () => {
    it('should return pipeline data', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(10);

      const result = await leadService.getPipelineFunnel({});

      expect(result.total).toBe(10);
    });
  });
});
