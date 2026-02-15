import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

const mockPrisma = {
  contentPiece: { findFirst: vi.fn(), update: vi.fn() },
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/ai', () => ({
  claudeGenerate: vi.fn().mockResolvedValue(JSON.stringify({
    templateId: 'stat-highlight',
    variables: { headline: 'SOC Stats', stat: '99.9%', description: 'Uptime', source: 'MarketingEngine' },
  })),
}));
vi.mock('../../lib/visual-generator', () => ({
  renderTemplate: vi.fn().mockResolvedValue(Buffer.from('fake-png')),
  getTemplate: vi.fn().mockReturnValue({
    id: 'stat-highlight', name: 'Stat Highlight', category: 'data',
    variables: [{ name: 'headline' }, { name: 'stat' }, { name: 'description' }],
    platforms: ['linkedin', 'twitter'],
  }),
  listTemplates: vi.fn().mockReturnValue([
    { id: 'stat-highlight', name: 'Stat Highlight', description: 'Show a key stat', category: 'data', bestFor: ['linkedin'], variables: [{ name: 'headline' }, { name: 'stat' }] },
    { id: 'quote-card', name: 'Quote Card', description: 'Quote card', category: 'quote', bestFor: ['linkedin', 'twitter'], variables: [{ name: 'quote' }, { name: 'author' }] },
  ]),
  PLATFORM_DIMENSIONS: { linkedin: { width: 1200, height: 627 }, twitter: { width: 1200, height: 675 } },
}));
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
}));

const visualService = await import('../visual.service');

const mockPiece = {
  id: 'cp-1', title: 'SOC Stats', body: 'Key metrics about SOC', platform: 'linkedin',
  brand: {
    name: 'MarketingEngine',
    brandVoice: { tone: ['expert'] },
    visualGuidelines: { primaryColor: '#6366f1' },
  },
  templateId: 'stat-highlight',
  templateData: { headline: 'SOC Stats', stat: '99.9%' },
};

describe('visual.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('generateVisualFromTemplate', () => {
    it('should render visual and update piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.contentPiece.update.mockResolvedValue({ ...mockPiece, mediaUrl: '/visuals/cp-1.png' });

      const result = await visualService.generateVisualFromTemplate('cp-1', 'stat-highlight');

      expect(result.mediaUrl).toBeDefined();
      expect(result.templateId).toBe('stat-highlight');
      expect(mockPrisma.contentPiece.update).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND for missing piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      await expect(visualService.generateVisualFromTemplate('x', 'stat-highlight')).rejects.toThrow(AppError);
    });

    it('should throw VALIDATION_ERROR for missing template', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      const { getTemplate } = await import('../../lib/visual-generator');
      (getTemplate as any).mockReturnValueOnce(null);

      await expect(visualService.generateVisualFromTemplate('cp-1', 'invalid')).rejects.toThrow(AppError);
    });
  });

  describe('suggestTemplate', () => {
    it('should suggest template based on content and platform', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);

      const result = await visualService.suggestTemplate('cp-1');

      expect(result.templateId).toBeDefined();
      expect(result.variables).toBeDefined();
    });

    it('should throw NOT_FOUND for missing piece', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      await expect(visualService.suggestTemplate('x')).rejects.toThrow(AppError);
    });
  });

  describe('listTemplates', () => {
    it('should return available templates', () => {
      const templates = visualService.listTemplates();
      expect(templates).toHaveLength(2);
    });
  });
});
