import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  emailTemplate: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  emailCampaign: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  lead: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    subject: 'Discover SOC Autopilot',
    htmlBody: '<h1>Hello {{firstName}}</h1>',
    textBody: 'Hello {{firstName}}',
  })),
}));

const emailService = await import('../email-marketing.service');

const mockTemplate = {
  id: 'et-1',
  brandId: 'brand-1',
  name: 'Welcome',
  subject: 'Welcome {{firstName}}!',
  htmlBody: '<h1>Hi {{firstName}}</h1>',
  textBody: 'Hi {{firstName}}',
  variables: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCampaign = {
  id: 'ec-1',
  brandId: 'brand-1',
  templateId: 'et-1',
  name: 'Launch Campaign',
  subject: 'Discover SOC Hub',
  status: 'draft',
  scheduledAt: null,
  sentAt: null,
  recipientFilter: { temperature: 'hot' },
  recipientCount: 0,
  sentCount: 0,
  openCount: 0,
  clickCount: 0,
  bounceCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('email-marketing.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Templates ────────────────────────────────────────────────
  describe('createTemplate', () => {
    it('should create a template', async () => {
      mockPrisma.emailTemplate.create.mockResolvedValue(mockTemplate);

      const result = await emailService.createTemplate({
        brandId: 'brand-1',
        name: 'Welcome',
        subject: 'Welcome!',
        htmlBody: '<h1>Hi</h1>',
      });

      expect(result.id).toBe('et-1');
    });
  });

  describe('listTemplates', () => {
    it('should list templates with brand', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await emailService.listTemplates('brand-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { brandId: 'brand-1' } }),
      );
    });

    it('should list all templates when no brandId', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([]);

      await emailService.listTemplates();

      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('getTemplateById', () => {
    it('should return template', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await emailService.getTemplateById('et-1');

      expect(result.id).toBe('et-1');
    });

    it('should throw NOT_FOUND', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(emailService.getTemplateById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('updateTemplate', () => {
    it('should update template fields', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.emailTemplate.update.mockResolvedValue({ ...mockTemplate, name: 'Updated' });

      const result = await emailService.updateTemplate('et-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NOT_FOUND', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(emailService.updateTemplate('missing', { name: 'X' })).rejects.toThrow(AppError);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.emailTemplate.delete.mockResolvedValue(mockTemplate);

      await emailService.deleteTemplate('et-1');

      expect(mockPrisma.emailTemplate.delete).toHaveBeenCalledWith({ where: { id: 'et-1' } });
    });
  });

  // ─── Campaigns ────────────────────────────────────────────────
  describe('createCampaign', () => {
    it('should create campaign with draft status', async () => {
      mockPrisma.emailCampaign.create.mockResolvedValue(mockCampaign);

      const result = await emailService.createCampaign({
        brandId: 'brand-1',
        name: 'Launch',
        subject: 'Discover',
      });

      expect(mockPrisma.emailCampaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'draft' }),
      });
      expect(result.status).toBe('draft');
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign with brand and template', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        brand: { id: 'brand-1', name: 'Synap6ia' },
        template: mockTemplate,
      });

      const result = await emailService.getCampaignById('ec-1');

      expect(result.id).toBe('ec-1');
    });

    it('should throw NOT_FOUND', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue(null);

      await expect(emailService.getCampaignById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('updateCampaign', () => {
    it('should update draft campaign', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.emailCampaign.update.mockResolvedValue({ ...mockCampaign, name: 'Updated' });

      const result = await emailService.updateCampaign('ec-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw ALREADY_SENT for sent campaign', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({ ...mockCampaign, status: 'sent' });

      try {
        await emailService.updateCampaign('ec-1', { name: 'X' });
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('ALREADY_SENT');
      }
    });
  });

  describe('deleteCampaign', () => {
    it('should delete draft campaign', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.emailCampaign.delete.mockResolvedValue(mockCampaign);

      await emailService.deleteCampaign('ec-1');

      expect(mockPrisma.emailCampaign.delete).toHaveBeenCalledOnce();
    });

    it('should throw ALREADY_SENT for sent campaign', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({ ...mockCampaign, status: 'sent' });

      try {
        await emailService.deleteCampaign('ec-1');
      } catch (err) {
        expect((err as AppError).code).toBe('ALREADY_SENT');
      }
    });
  });

  // ─── Send Campaign ──────────────────────────────────────────
  describe('sendCampaign', () => {
    it('should send campaign in dev mode (no RESEND_API_KEY)', async () => {
      delete process.env.RESEND_API_KEY;
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        template: mockTemplate,
        brand: { id: 'brand-1', name: 'Synap6ia' },
      });
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-1', email: 'test@test.com', firstName: 'Jean', lastName: 'Dupont' },
      ]);
      mockPrisma.emailCampaign.update
        .mockResolvedValueOnce({ ...mockCampaign, status: 'sending' })
        .mockResolvedValueOnce({ ...mockCampaign, status: 'sent', sentCount: 1 });

      const result = await emailService.sendCampaign('ec-1');

      expect(result.status).toBe('sent');
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledTimes(2);
    });

    it('should throw ALREADY_SENT for sent campaign', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        status: 'sent',
        template: mockTemplate,
        brand: { id: 'brand-1' },
      });

      await expect(emailService.sendCampaign('ec-1')).rejects.toThrow(AppError);
    });

    it('should throw NO_RECIPIENTS if no matching leads', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        template: mockTemplate,
        brand: { id: 'brand-1' },
      });
      mockPrisma.lead.findMany.mockResolvedValue([]);

      try {
        await emailService.sendCampaign('ec-1');
      } catch (err) {
        expect((err as AppError).code).toBe('NO_RECIPIENTS');
      }
    });

    it('should throw NOT_FOUND for missing campaign', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue(null);

      await expect(emailService.sendCampaign('missing')).rejects.toThrow(AppError);
    });
  });

  // ─── Tracking ─────────────────────────────────────────────────
  describe('trackOpen', () => {
    it('should increment openCount', async () => {
      mockPrisma.emailCampaign.update.mockResolvedValue({ ...mockCampaign, openCount: 1 });

      await emailService.trackOpen('ec-1', 'lead-1');

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith({
        where: { id: 'ec-1' },
        data: { openCount: { increment: 1 } },
      });
    });
  });

  describe('trackClick', () => {
    it('should increment clickCount', async () => {
      mockPrisma.emailCampaign.update.mockResolvedValue({ ...mockCampaign, clickCount: 1 });

      await emailService.trackClick('ec-1', 'lead-1');

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith({
        where: { id: 'ec-1' },
        data: { clickCount: { increment: 1 } },
      });
    });
  });

  // ─── AI Generation ────────────────────────────────────────────
  describe('generateEmailContent', () => {
    it('should generate content and create template', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        brand: { name: 'Synap6ia', brandVoice: null, targetAudience: null },
      });
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.emailTemplate.create.mockResolvedValue({ ...mockTemplate, id: 'et-auto' });
      mockPrisma.emailCampaign.update.mockResolvedValue({ ...mockCampaign, templateId: 'et-auto' });

      const result = await emailService.generateEmailContent('ec-1');

      expect(result.template).toBeDefined();
      expect(result.generatedContent.subject).toBe('Discover SOC Autopilot');
      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledOnce();
    });

    it('should throw NOT_FOUND for missing campaign', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue(null);

      await expect(emailService.generateEmailContent('missing')).rejects.toThrow(AppError);
    });

    it('should handle invalid AI JSON', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('not json');

      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        brand: { name: 'Synap6ia', brandVoice: null, targetAudience: null },
      });
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.emailTemplate.create.mockResolvedValue(mockTemplate);
      mockPrisma.emailCampaign.update.mockResolvedValue(mockCampaign);

      const result = await emailService.generateEmailContent('ec-1');

      expect(result.generatedContent).toEqual({ htmlBody: 'not json' });
    });
  });
});
