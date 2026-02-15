import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  brand: { findFirst: vi.fn() },
  contentPillar: { create: vi.fn(), findMany: vi.fn() },
  contentInput: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
  contentPiece: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    title: 'AI-Generated Title',
    body: 'AI-generated body content',
    hashtags: ['#ai', '#soc'],
    callToAction: 'Learn more',
    mediaPrompt: 'Professional illustration',
    framework: 'AIDA',
    topic: 'SOC automation',
    angle: 'ROI-focused',
    keyMessages: ['msg1'],
    platforms: ['linkedin'],
    formatSuggestions: ['post'],
    hashtagSuggestions: ['#soc'],
  })),
  whisperTranscribe: vi.fn().mockResolvedValue('Transcribed audio about SOC automation'),
  dalleGenerate: vi.fn().mockResolvedValue('https://example.com/generated.png'),
}));
vi.mock('../../lib/n8n', () => ({ triggerWorkflow: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('../../lib/copy-frameworks', () => ({
  getFramework: vi.fn().mockReturnValue(null),
  getFrameworksForPlatform: vi.fn().mockReturnValue([]),
  buildFrameworkPrompt: vi.fn().mockReturnValue(''),
}));

const contentService = await import('../content.service');

const mockBrand = { id: 'brand-1', name: 'Synap6ia', brandVoice: null, targetAudience: null, contentGuidelines: null };
const mockInput = {
  id: 'ci-1', brandId: 'brand-1', createdById: 'user-1', inputType: 'text',
  rawContent: 'AI in SOC ops', aiResearch: null, status: 'pending',
  brand: { id: 'brand-1', name: 'Synap6ia', brandVoice: null, targetAudience: null, contentGuidelines: null },
};
const mockPiece = {
  id: 'cp-1', brandId: 'brand-1', title: 'Test', body: 'Test body', platform: 'linkedin',
  status: 'draft', mediaPrompt: 'Professional visual', mediaUrl: null,
  brand: { id: 'brand-1', visualGuidelines: null },
};

describe('content.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createPillar', () => {
    it('should create content pillar', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.contentPillar.create.mockResolvedValue({ id: 'p-1', name: 'Security' });

      const result = await contentService.createPillar({ brandId: 'brand-1', name: 'Security' });
      expect(result.name).toBe('Security');
    });

    it('should throw NOT_FOUND for missing brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);
      await expect(contentService.createPillar({ brandId: 'x', name: 'y' })).rejects.toThrow(AppError);
    });
  });

  describe('createInput', () => {
    it('should create input and trigger workflow', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.contentInput.create.mockResolvedValue({ id: 'ci-1', status: 'pending' });

      const result = await contentService.createInput('user-1', {
        brandId: 'brand-1', inputType: 'text', rawContent: 'Some content',
      });

      expect(result.status).toBe('pending');
      const { triggerWorkflow } = await import('../../lib/n8n');
      expect(triggerWorkflow).toHaveBeenCalledWith('mkt-101', expect.any(Object));
    });
  });

  describe('createAudioInput', () => {
    it('should transcribe audio, generate summary, and create input', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
      mockPrisma.contentInput.create.mockResolvedValue({ id: 'ci-2', inputType: 'audio', status: 'processed' });

      const result = await contentService.createAudioInput('user-1', {
        brandId: 'brand-1', audioBuffer: Buffer.from('fake'), filename: 'test.mp3',
      });

      const { whisperTranscribe } = await import('../../lib/ai');
      expect(whisperTranscribe).toHaveBeenCalledOnce();
      expect(result.status).toBe('processed');
    });
  });

  describe('getInputById', () => {
    it('should throw NOT_FOUND for missing input', async () => {
      mockPrisma.contentInput.findFirst.mockResolvedValue(null);
      await expect(contentService.getInputById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('runAiResearch', () => {
    it('should run AI research and update input status to researched', async () => {
      mockPrisma.contentInput.findFirst.mockResolvedValue(mockInput);
      mockPrisma.contentInput.update.mockResolvedValue({ ...mockInput, status: 'researched' });

      const result = await contentService.runAiResearch('ci-1');

      expect(result.status).toBe('researched');
      expect(mockPrisma.contentInput.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'researched' }) }),
      );
    });

    it('should throw NOT_FOUND for missing input', async () => {
      mockPrisma.contentInput.findFirst.mockResolvedValue(null);
      await expect(contentService.runAiResearch('missing')).rejects.toThrow(AppError);
    });
  });

  describe('generateContentPiece', () => {
    it('should generate content piece with AI', async () => {
      mockPrisma.contentInput.findFirst.mockResolvedValue(mockInput);
      mockPrisma.contentPiece.create.mockResolvedValue({ ...mockPiece, status: 'review' });

      const result = await contentService.generateContentPiece('ci-1', 'linkedin');

      expect(result.status).toBe('review');
      expect(mockPrisma.contentPiece.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ platform: 'linkedin', status: 'review' }),
      });
    });

    it('should handle invalid JSON from AI', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('not json');
      mockPrisma.contentInput.findFirst.mockResolvedValue(mockInput);
      mockPrisma.contentPiece.create.mockResolvedValue(mockPiece);

      const result = await contentService.generateContentPiece('ci-1', 'linkedin');
      expect(result).toBeDefined();
    });
  });

  describe('generateVisual', () => {
    it('should generate visual with DALL-E and update piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.contentPiece.update.mockResolvedValue({ ...mockPiece, mediaUrl: 'https://example.com/generated.png' });

      const result = await contentService.generateVisual('cp-1');

      const { dalleGenerate } = await import('../../lib/ai');
      expect(dalleGenerate).toHaveBeenCalledOnce();
      expect(result.mediaUrl).toBe('https://example.com/generated.png');
    });

    it('should throw NOT_FOUND for missing piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      await expect(contentService.generateVisual('missing')).rejects.toThrow(AppError);
    });
  });

  describe('listPieces', () => {
    it('should filter by status and return paginated result', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([]);
      mockPrisma.contentPiece.count.mockResolvedValue(0);
      const result = await contentService.listPieces({ status: 'draft' });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockPrisma.contentPiece.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'draft' }) }),
      );
    });
  });

  describe('getPieceById', () => {
    it('should throw NOT_FOUND', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      await expect(contentService.getPieceById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('updatePieceStatus', () => {
    it('should update piece status', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.contentPiece.update.mockResolvedValue({ ...mockPiece, status: 'approved' });

      const result = await contentService.updatePieceStatus('cp-1', 'approved');
      expect(result.status).toBe('approved');
    });
  });
});
