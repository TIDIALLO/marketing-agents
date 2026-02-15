import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  brand: { findFirst: vi.fn() },
  platformUser: { findFirst: vi.fn() },
  socialAccount: { findMany: vi.fn() },
  contentInput: { findFirst: vi.fn(), create: vi.fn() },
  contentPiece: { update: vi.fn() },
  contentSchedule: { create: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

const mockGetCalendarEntries = vi.fn();
const mockMarkAsSynced = vi.fn();
vi.mock('../../lib/notion', () => ({
  getCalendarEntries: (...args: unknown[]) => mockGetCalendarEntries(...args),
  markAsSynced: (...args: unknown[]) => mockMarkAsSynced(...args),
}));

const mockGenerateContentPiece = vi.fn();
vi.mock('../content.service', () => ({
  generateContentPiece: (...args: unknown[]) => mockGenerateContentPiece(...args),
}));

vi.mock('../publishing.service', () => ({
  getNextOptimalTime: vi.fn().mockReturnValue(new Date('2026-02-14T10:00:00Z')),
}));

const { syncNotionCalendar } = await import('../notion-content.service');

const mockBrand = { id: 'brand-1', name: 'MarketingEngine' };
const mockUser = { id: 'user-1', email: 'admin@mktengine.dev' };
const mockSocialAccounts = [
  { id: 'sa-1', platform: 'linkedin', brandId: 'brand-1', status: 'active' },
  { id: 'sa-2', platform: 'twitter', brandId: 'brand-1', status: 'active' },
  { id: 'sa-3', platform: 'instagram', brandId: 'brand-1', status: 'active' },
  { id: 'sa-4', platform: 'facebook', brandId: 'brand-1', status: 'active' },
];

describe('notion-content.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);
    mockPrisma.platformUser.findFirst.mockResolvedValue(mockUser);
    mockPrisma.socialAccount.findMany.mockResolvedValue(mockSocialAccounts);
    mockPrisma.contentInput.findFirst.mockResolvedValue(null); // no duplicates
    mockPrisma.contentInput.create.mockResolvedValue({ id: 'ci-1' });
    mockPrisma.contentSchedule.create.mockResolvedValue({ id: 'cs-1', status: 'scheduled' });
    mockPrisma.contentPiece.update.mockResolvedValue({});
    mockGenerateContentPiece.mockResolvedValue({ id: 'cp-1', platform: 'linkedin' });
    mockMarkAsSynced.mockResolvedValue(undefined);
  });

  describe('syncNotionCalendar', () => {
    it('should sync entries and create content for each platform', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        {
          id: 'page-1',
          pageUrl: 'https://notion.so/page-1',
          date: '2026-02-14',
          topic: 'Alert Fatigue in SOC teams',
          platforms: ['linkedin', 'twitter'],
          brief: 'Focus on ROI metrics',
          status: 'Planned',
        },
      ]);

      const result = await syncNotionCalendar(new Date('2026-02-14'));

      expect(result.created).toBe(1);
      expect(result.scheduled).toBe(2); // linkedin + twitter
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);

      // ContentInput created with notion type
      expect(mockPrisma.contentInput.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          brandId: 'brand-1',
          inputType: 'notion',
          sourceUrl: 'https://notion.so/page-1',
          rawContent: expect.stringContaining('Alert Fatigue'),
        }),
      });

      // Generated for both platforms
      expect(mockGenerateContentPiece).toHaveBeenCalledTimes(2);
      expect(mockGenerateContentPiece).toHaveBeenCalledWith('ci-1', 'linkedin');
      expect(mockGenerateContentPiece).toHaveBeenCalledWith('ci-1', 'twitter');

      // Schedules created
      expect(mockPrisma.contentSchedule.create).toHaveBeenCalledTimes(2);

      // Marked as synced
      expect(mockMarkAsSynced).toHaveBeenCalledWith('page-1');
    });

    it('should skip duplicate entries based on sourceUrl', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        {
          id: 'page-1',
          pageUrl: 'https://notion.so/page-1',
          date: '2026-02-14',
          topic: 'Already synced topic',
          platforms: ['linkedin'],
          brief: '',
          status: 'Planned',
        },
      ]);

      // Simulate existing input with same sourceUrl
      mockPrisma.contentInput.findFirst.mockResolvedValue({ id: 'ci-existing', sourceUrl: 'https://notion.so/page-1' });

      const result = await syncNotionCalendar();

      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
      expect(mockPrisma.contentInput.create).not.toHaveBeenCalled();
      expect(mockGenerateContentPiece).not.toHaveBeenCalled();
    });

    it('should return empty result when no entries found', async () => {
      mockGetCalendarEntries.mockResolvedValue([]);

      const result = await syncNotionCalendar();

      expect(result).toEqual({ created: 0, scheduled: 0, skipped: 0, errors: [] });
      expect(mockPrisma.brand.findFirst).not.toHaveBeenCalled();
    });

    it('should default to linkedin when no platforms specified', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        {
          id: 'page-2',
          pageUrl: 'https://notion.so/page-2',
          date: '2026-02-14',
          topic: 'No platform specified',
          platforms: [],
          brief: '',
          status: 'Planned',
        },
      ]);

      const result = await syncNotionCalendar();

      expect(result.scheduled).toBe(1);
      expect(mockGenerateContentPiece).toHaveBeenCalledWith('ci-1', 'linkedin');
    });

    it('should report error when no brand exists', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);
      mockGetCalendarEntries.mockResolvedValue([
        { id: 'p1', pageUrl: 'url', date: '2026-02-14', topic: 'T', platforms: [], brief: '', status: 'Planned' },
      ]);

      const result = await syncNotionCalendar();

      expect(result.errors).toContain('No brand found — cannot create content');
      expect(result.created).toBe(0);
    });

    it('should report error when no user exists', async () => {
      mockPrisma.platformUser.findFirst.mockResolvedValue(null);
      mockGetCalendarEntries.mockResolvedValue([
        { id: 'p1', pageUrl: 'url', date: '2026-02-14', topic: 'T', platforms: [], brief: '', status: 'Planned' },
      ]);

      const result = await syncNotionCalendar();

      expect(result.errors).toContain('No user found — cannot create content');
    });

    it('should continue processing other entries when one fails generation', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        { id: 'p1', pageUrl: 'https://notion.so/p1', date: '2026-02-14', topic: 'Good', platforms: ['linkedin'], brief: '', status: 'Planned' },
        { id: 'p2', pageUrl: 'https://notion.so/p2', date: '2026-02-14', topic: 'Also good', platforms: ['linkedin'], brief: '', status: 'Planned' },
      ]);

      mockGenerateContentPiece
        .mockRejectedValueOnce(new Error('AI generation failed'))
        .mockResolvedValueOnce({ id: 'cp-2', platform: 'linkedin' });

      const result = await syncNotionCalendar();

      expect(result.created).toBe(2);
      expect(result.scheduled).toBe(1); // Only second one succeeded
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('AI generation failed');
    });

    it('should handle markAsSynced failure gracefully', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        { id: 'p1', pageUrl: 'https://notion.so/p1', date: '2026-02-14', topic: 'T', platforms: ['linkedin'], brief: '', status: 'Planned' },
      ]);
      mockMarkAsSynced.mockRejectedValue(new Error('Notion API down'));

      const result = await syncNotionCalendar();

      expect(result.created).toBe(1);
      expect(result.scheduled).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to mark Notion entry as synced');
    });

    it('should filter out invalid platform names', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        { id: 'p1', pageUrl: 'https://notion.so/p1', date: '2026-02-14', topic: 'T', platforms: ['linkedin', 'myspace', 'instagram'], brief: '', status: 'Planned' },
      ]);

      const result = await syncNotionCalendar();

      // Only linkedin and instagram are valid
      expect(mockGenerateContentPiece).toHaveBeenCalledTimes(2);
      expect(mockGenerateContentPiece).toHaveBeenCalledWith('ci-1', 'linkedin');
      expect(mockGenerateContentPiece).toHaveBeenCalledWith('ci-1', 'instagram');
      expect(result.scheduled).toBe(2);
    });

    it('should include brief in rawContent when present', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        { id: 'p1', pageUrl: 'https://notion.so/p1', date: '2026-02-14', topic: 'SOC Metrics', platforms: ['linkedin'], brief: 'Include CTA to demo', status: 'Planned' },
      ]);

      await syncNotionCalendar();

      expect(mockPrisma.contentInput.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rawContent: 'Topic: SOC Metrics\n\nBrief: Include CTA to demo',
        }),
      });
    });

    it('should use topic only as rawContent when no brief', async () => {
      mockGetCalendarEntries.mockResolvedValue([
        { id: 'p1', pageUrl: 'https://notion.so/p1', date: '2026-02-14', topic: 'SOC Metrics', platforms: ['linkedin'], brief: '', status: 'Planned' },
      ]);

      await syncNotionCalendar();

      expect(mockPrisma.contentInput.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rawContent: 'SOC Metrics',
        }),
      });
    });
  });
});
