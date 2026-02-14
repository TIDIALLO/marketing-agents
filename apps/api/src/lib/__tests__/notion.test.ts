import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    databases: { query: mockQuery },
    pages: { update: mockUpdate },
  })),
}));

describe('notion', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NOTION_API_KEY', 'secret_test');
    vi.stubEnv('NOTION_CALENDAR_DB_ID', 'db-123');
  });

  describe('getCalendarEntries', () => {
    it('should fetch and parse calendar entries for today', async () => {
      mockQuery.mockResolvedValue({
        results: [
          {
            id: 'page-1',
            url: 'https://notion.so/page-1',
            properties: {
              Topic: { title: [{ plain_text: 'Alert Fatigue in SOC teams' }] },
              Date: { date: { start: '2026-02-14' } },
              Platforms: { multi_select: [{ name: 'LinkedIn' }, { name: 'X' }] },
              Brief: { rich_text: [{ plain_text: 'Focus on ROI metrics' }] },
              Status: { select: { name: 'Planned' } },
            },
          },
        ],
      });

      const { getCalendarEntries } = await import('../notion');
      const entries = await getCalendarEntries(new Date('2026-02-14'));

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        id: 'page-1',
        pageUrl: 'https://notion.so/page-1',
        date: '2026-02-14',
        topic: 'Alert Fatigue in SOC teams',
        platforms: ['linkedin', 'x'],
        brief: 'Focus on ROI metrics',
        status: 'Planned',
      });

      expect(mockQuery).toHaveBeenCalledWith({
        database_id: 'db-123',
        filter: {
          and: [
            { property: 'Date', date: { equals: '2026-02-14' } },
            { property: 'Status', select: { does_not_equal: 'Cancelled' } },
            { property: 'Status', select: { does_not_equal: 'Synced' } },
          ],
        },
      });
    });

    it('should return empty array when no entries match', async () => {
      mockQuery.mockResolvedValue({ results: [] });

      const { getCalendarEntries } = await import('../notion');
      const entries = await getCalendarEntries();

      expect(entries).toEqual([]);
    });

    it('should handle entries with missing optional properties', async () => {
      mockQuery.mockResolvedValue({
        results: [
          {
            id: 'page-2',
            url: 'https://notion.so/page-2',
            properties: {
              Topic: { title: [] },
              Date: { date: null },
              Platforms: { multi_select: [] },
              Brief: { rich_text: [] },
              Status: { select: null },
            },
          },
        ],
      });

      const { getCalendarEntries } = await import('../notion');
      const entries = await getCalendarEntries(new Date('2026-02-14'));

      expect(entries).toHaveLength(1);
      expect(entries[0].topic).toBe('');
      expect(entries[0].platforms).toEqual([]);
      expect(entries[0].brief).toBe('');
      expect(entries[0].status).toBe('Planned');
    });

    it('should throw when NOTION_CALENDAR_DB_ID is not configured', async () => {
      vi.stubEnv('NOTION_CALENDAR_DB_ID', '');

      const { getCalendarEntries } = await import('../notion');
      await expect(getCalendarEntries()).rejects.toThrow('NOTION_CALENDAR_DB_ID is not configured');
    });

    it('should throw when NOTION_API_KEY is not configured', async () => {
      vi.stubEnv('NOTION_API_KEY', '');

      const { getCalendarEntries } = await import('../notion');
      await expect(getCalendarEntries()).rejects.toThrow('NOTION_API_KEY is not configured');
    });
  });

  describe('markAsSynced', () => {
    it('should update page status to Synced', async () => {
      mockUpdate.mockResolvedValue({});

      const { markAsSynced } = await import('../notion');
      await markAsSynced('page-1');

      expect(mockUpdate).toHaveBeenCalledWith({
        page_id: 'page-1',
        properties: {
          Status: { select: { name: 'Synced' } },
        },
      });
    });
  });
});
