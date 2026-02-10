import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

const mockPrisma = {
  contentPiece: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  contentSchedule: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  socialAccount: { findUnique: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    title: 'Adapted Title', body: 'Adapted body', hashtags: ['#soc'], callToAction: 'Follow', mediaPrompt: '',
  })),
  dalleGenerate: vi.fn().mockResolvedValue('https://dalle.example.com/img.png'),
}));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/encryption', () => ({ decrypt: vi.fn().mockReturnValue('access-token') }));
vi.mock('../../lib/linkedin', () => ({
  publishLinkedInPost: vi.fn().mockResolvedValue('urn:li:share:123'),
}));
vi.mock('../../lib/twitter', () => ({
  publishTweet: vi.fn().mockResolvedValue('tweet-123'),
  uploadTwitterMedia: vi.fn().mockResolvedValue('media-123'),
}));

const publishingService = await import('../publishing.service');

const mockSourcePiece = {
  id: 'cp-1', brandId: 'brand-1', platform: 'linkedin', status: 'approved',
  title: 'SOC Post', body: 'Content about SOC', hashtags: ['#soc'], callToAction: 'Learn more',
  contentInputId: 'ci-1', mediaUrl: null, mediaPrompt: null,
  brand: {
    brandVoice: { tone: ['expert'] }, targetAudience: { segment: 'PME' },
    socialAccounts: [
      { id: 'sa-1', platform: 'linkedin', status: 'active' },
      { id: 'sa-2', platform: 'twitter', status: 'active' },
    ],
  },
};

describe('publishing.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('adaptToAllPlatforms', () => {
    it('should create variants for other platforms and schedule all', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockSourcePiece);
      mockPrisma.contentPiece.create.mockResolvedValue({ id: 'cp-2', platform: 'twitter', status: 'scheduled' });
      mockPrisma.contentSchedule.create.mockResolvedValue({ id: 'cs-1', status: 'scheduled' });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const result = await publishingService.adaptToAllPlatforms('cp-1');

      expect(result.variants).toHaveLength(1); // twitter variant
      expect(result.schedules.length).toBeGreaterThanOrEqual(2); // source + twitter
      expect(mockPrisma.contentPiece.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ platform: 'twitter', parentId: 'cp-1', status: 'scheduled' }),
      });
    });

    it('should return empty variants when no other platform accounts', async () => {
      const singlePlatformPiece = {
        ...mockSourcePiece,
        brand: {
          ...mockSourcePiece.brand,
          socialAccounts: [{ id: 'sa-1', platform: 'linkedin', status: 'active' }],
        },
      };
      mockPrisma.contentPiece.findFirst.mockResolvedValue(singlePlatformPiece);
      mockPrisma.contentSchedule.create.mockResolvedValue({ id: 'cs-1' });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const result = await publishingService.adaptToAllPlatforms('cp-1');

      expect(result.variants).toHaveLength(0);
      expect(result.schedules).toHaveLength(0);
    });

    it('should throw NOT_FOUND for non-approved piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      await expect(publishingService.adaptToAllPlatforms('x')).rejects.toThrow(AppError);
    });
  });

  describe('scheduleContent', () => {
    it('should create schedule and update piece status', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue({ id: 'cp-1', status: 'approved' });
      mockPrisma.contentSchedule.create.mockResolvedValue({ id: 'cs-1', status: 'scheduled' });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const result = await publishingService.scheduleContent('cp-1', 'sa-1', new Date());

      expect(result.status).toBe('scheduled');
      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'scheduled' },
      });
    });

    it('should throw NOT_FOUND for missing piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      await expect(publishingService.scheduleContent('x', 'sa-1', new Date())).rejects.toThrow(AppError);
    });
  });

  describe('listSchedules', () => {
    it('should return schedules with filters', async () => {
      mockPrisma.contentSchedule.findMany.mockResolvedValue([{ id: 'cs-1' }]);
      const result = await publishingService.listSchedules({ brandId: 'brand-1', status: 'scheduled' });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule time', async () => {
      const newDate = new Date('2025-06-01T10:00:00Z');
      mockPrisma.contentSchedule.findFirst.mockResolvedValue({ id: 'cs-1', status: 'scheduled' });
      mockPrisma.contentSchedule.update.mockResolvedValue({ id: 'cs-1', scheduledAt: newDate, status: 'scheduled' });

      const result = await publishingService.updateSchedule('cs-1', { scheduledAt: newDate });

      expect(result.status).toBe('scheduled');
    });

    it('should throw NOT_FOUND for missing schedule', async () => {
      mockPrisma.contentSchedule.findFirst.mockResolvedValue(null);
      await expect(publishingService.updateSchedule('x', {})).rejects.toThrow(AppError);
    });

    it('should throw ALREADY_PUBLISHED for published schedule', async () => {
      mockPrisma.contentSchedule.findFirst.mockResolvedValue({ id: 'cs-1', status: 'published' });
      await expect(publishingService.updateSchedule('cs-1', {})).rejects.toThrow(AppError);
    });
  });

  describe('publishScheduledContent', () => {
    it('should publish due content to LinkedIn', async () => {
      mockPrisma.contentSchedule.findMany.mockResolvedValue([{
        id: 'cs-1', contentPieceId: 'cp-1', retryCount: 0,
        contentPiece: { title: 'Post', body: 'Body', hashtags: ['#soc'], mediaUrl: null },
        socialAccount: { id: 'sa-1', platform: 'linkedin', accessTokenEncrypted: 'enc', platformUserId: 'uid', profileType: 'person' },
      }]);
      mockPrisma.socialAccount.findUnique.mockResolvedValue({ id: 'sa-1', accessTokenEncrypted: 'enc', platformUserId: 'uid', profileType: 'person' });
      mockPrisma.contentSchedule.update.mockResolvedValue({});
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const results = await publishingService.publishScheduledContent();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      const { publishLinkedInPost } = await import('../../lib/linkedin');
      expect(publishLinkedInPost).toHaveBeenCalledOnce();
    });

    it('should retry on failure and schedule next attempt', async () => {
      mockPrisma.contentSchedule.findMany.mockResolvedValue([{
        id: 'cs-1', contentPieceId: 'cp-1', retryCount: 0,
        contentPiece: { title: 'Post', body: 'Body', hashtags: [], mediaUrl: null },
        socialAccount: { id: 'sa-1', platform: 'linkedin' },
      }]);
      mockPrisma.socialAccount.findUnique.mockResolvedValue(null); // Will cause publishToSocialPlatform to throw
      mockPrisma.contentSchedule.update.mockResolvedValue({});

      const results = await publishingService.publishScheduledContent();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Retry 1/3');
    });

    it('should mark as failed after max retries and notify Slack', async () => {
      mockPrisma.contentSchedule.findMany.mockResolvedValue([{
        id: 'cs-1', contentPieceId: 'cp-1', retryCount: 2, // Already 2, next = 3 = MAX
        contentPiece: { title: 'Post', body: 'Body', hashtags: [], mediaUrl: null },
        socialAccount: { id: 'sa-1', platform: 'linkedin' },
      }]);
      mockPrisma.socialAccount.findUnique.mockResolvedValue(null);
      mockPrisma.contentSchedule.update.mockResolvedValue({});
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const results = await publishingService.publishScheduledContent();

      expect(results[0].success).toBe(false);
      const { sendSlackNotification } = await import('../../lib/slack');
      expect(sendSlackNotification).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('échouée') }),
      );
    });

    it('should return empty array when nothing is due', async () => {
      mockPrisma.contentSchedule.findMany.mockResolvedValue([]);
      const results = await publishingService.publishScheduledContent();
      expect(results).toEqual([]);
    });
  });

  describe('publishSingle', () => {
    it('should publish a single schedule immediately', async () => {
      mockPrisma.contentSchedule.findFirst.mockResolvedValue({
        id: 'cs-1', status: 'scheduled', contentPieceId: 'cp-1',
        contentPiece: { title: 'Post', body: 'Content', hashtags: ['#test'], mediaUrl: null },
        socialAccount: { id: 'sa-1', platform: 'twitter' },
      });
      mockPrisma.socialAccount.findUnique.mockResolvedValue({ id: 'sa-1', accessTokenEncrypted: 'enc' });
      mockPrisma.contentSchedule.update.mockResolvedValue({});
      mockPrisma.contentPiece.update.mockResolvedValue({ id: 'cp-1', status: 'published', platformPostId: 'tweet-123' });

      const result = await publishingService.publishSingle('cs-1');

      expect(result.status).toBe('published');
      const { publishTweet } = await import('../../lib/twitter');
      expect(publishTweet).toHaveBeenCalledOnce();
    });

    it('should throw NOT_FOUND for missing schedule', async () => {
      mockPrisma.contentSchedule.findFirst.mockResolvedValue(null);
      await expect(publishingService.publishSingle('x')).rejects.toThrow(AppError);
    });

    it('should throw ALREADY_PUBLISHED', async () => {
      mockPrisma.contentSchedule.findFirst.mockResolvedValue({ id: 'cs-1', status: 'published' });
      await expect(publishingService.publishSingle('cs-1')).rejects.toThrow(AppError);
    });
  });
});
