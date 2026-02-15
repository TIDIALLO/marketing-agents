import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

const mockPrisma = {
  contentPiece: { findFirst: vi.fn(), create: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    title: 'Thread: SOC Automation', body: 'Tweet 1\n---\nTweet 2', hashtags: ['#soc'], callToAction: 'Follow for more',
  })),
}));

const repurposeService = await import('../repurpose.service');

const mockPiece = {
  id: 'cp-1', brandId: 'brand-1', title: 'SOC Post', body: 'Long LinkedIn post about SOC',
  hashtags: ['#soc'], platform: 'linkedin',
  brand: { id: 'brand-1', name: 'MarketingEngine', brandVoice: { tone: ['expert'], languageStyle: { formality: 'professional' } }, targetAudience: null },
};

describe('repurpose.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('repurposePiece', () => {
    it('should repurpose to thread format', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.contentPiece.create.mockResolvedValue({
        id: 'cp-2', parentPieceId: 'cp-1', repurposeType: 'thread', platform: 'twitter', status: 'review',
      });

      const results = await repurposeService.repurposePiece('cp-1', ['thread']);

      expect(results).toHaveLength(1);
      expect(mockPrisma.contentPiece.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentPieceId: 'cp-1', repurposeType: 'thread', platform: 'twitter', status: 'review' }),
      });
    });

    it('should repurpose to multiple formats', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.contentPiece.create.mockResolvedValue({ id: 'cp-new', status: 'review' });

      const results = await repurposeService.repurposePiece('cp-1', ['thread', 'newsletter']);

      expect(results).toHaveLength(2);
      expect(mockPrisma.contentPiece.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NOT_FOUND for missing piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      await expect(repurposeService.repurposePiece('missing', ['thread'])).rejects.toThrow(AppError);
    });

    it('should handle invalid AI JSON gracefully', async () => {
      const { claudeGenerate } = await import('../../lib/ai');
      (claudeGenerate as any).mockResolvedValueOnce('not json');
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.contentPiece.create.mockResolvedValue({ id: 'cp-3', status: 'review' });

      const results = await repurposeService.repurposePiece('cp-1', ['blog-draft']);
      expect(results).toHaveLength(1);
    });
  });
});
