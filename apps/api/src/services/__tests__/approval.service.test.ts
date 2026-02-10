import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { AppError } from '../../lib/errors';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPrisma = {
  approvalQueue: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  contentPiece: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  platformUser: {
    findFirst: vi.fn(),
  },
};

const mockSendSlack = vi.fn().mockResolvedValue(true);
const mockSendApprovalEmail = vi.fn().mockResolvedValue(undefined);
const mockSendApprovalReminderEmail = vi.fn().mockResolvedValue(undefined);
const mockTriggerWorkflow = vi.fn().mockResolvedValue({ success: true });

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../../lib/slack', () => ({ sendSlackNotification: mockSendSlack }));
vi.mock('../../lib/email', () => ({
  sendApprovalEmail: mockSendApprovalEmail,
  sendApprovalReminderEmail: mockSendApprovalReminderEmail,
}));
vi.mock('../../lib/n8n', () => ({ triggerWorkflow: mockTriggerWorkflow }));

const approvalService = await import('../approval.service');

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

const now = new Date();
const mockApproval = {
  id: 'aq-1',
  entityType: 'content_piece',
  entityId: 'cp-1',
  assigneeId: 'user-1',
  status: 'pending',
  priority: 'normal',
  actionToken: 'hashed-token',
  tokenExpiresAt: new Date(Date.now() + 72 * 3600_000),
  reminderCount: 0,
  resolvedAt: null,
  resolvedBy: null,
  resolution: null,
  createdAt: now,
  updatedAt: now,
};

const mockPiece = {
  id: 'cp-1',
  title: 'Test Post',
  platform: 'linkedin',
  body: 'Test body content',
  mediaUrl: null,
  brand: { name: 'Synap6ia' },
};

const mockUser = {
  email: 'admin@synap6ia.com',
  notificationPreferences: { slack: true, email: true },
};

describe('approval.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitForApproval', () => {
    it('should create approval with hashed token', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(null);
      mockPrisma.approvalQueue.create.mockResolvedValue(mockApproval);
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.platformUser.findFirst.mockResolvedValue(mockUser);

      const result = await approvalService.submitForApproval('content_piece', 'cp-1', 'user-1');

      expect(result.id).toBe('aq-1');
      expect(mockPrisma.approvalQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'content_piece',
          entityId: 'cp-1',
          status: 'pending',
        }),
      });
    });

    it('should send Slack notification for content pieces', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(null);
      mockPrisma.approvalQueue.create.mockResolvedValue(mockApproval);
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.platformUser.findFirst.mockResolvedValue(mockUser);

      await approvalService.submitForApproval('content_piece', 'cp-1', 'user-1');

      expect(mockSendSlack).toHaveBeenCalledOnce();
      expect(mockSendSlack).toHaveBeenCalledWith(
        expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({ type: 'header' }),
          ]),
        }),
      );
    });

    it('should send approval email to assignee', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(null);
      mockPrisma.approvalQueue.create.mockResolvedValue(mockApproval);
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.platformUser.findFirst.mockResolvedValue(mockUser);

      await approvalService.submitForApproval('content_piece', 'cp-1', 'user-1');

      expect(mockSendApprovalEmail).toHaveBeenCalledWith('admin@synap6ia.com', expect.objectContaining({
        title: 'Test Post',
        platform: 'linkedin',
      }));
    });

    it('should skip email when user has email notifications disabled', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(null);
      mockPrisma.approvalQueue.create.mockResolvedValue(mockApproval);
      mockPrisma.contentPiece.findFirst.mockResolvedValue(mockPiece);
      mockPrisma.platformUser.findFirst.mockResolvedValue({
        email: 'admin@synap6ia.com',
        notificationPreferences: { email: false, slack: true },
      });

      await approvalService.submitForApproval('content_piece', 'cp-1', 'user-1');

      expect(mockSendApprovalEmail).not.toHaveBeenCalled();
    });

    it('should throw CONFLICT if pending approval exists', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(mockApproval);

      try {
        await approvalService.submitForApproval('content_piece', 'cp-1');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(409);
      }
    });
  });

  describe('resolveByToken', () => {
    it('should resolve approval and update content piece to approved', async () => {
      const rawToken = 'raw-test-token';
      const hashed = hashToken(rawToken);
      mockPrisma.approvalQueue.findFirst.mockResolvedValue({ ...mockApproval, actionToken: hashed });
      mockPrisma.approvalQueue.update.mockResolvedValue({ ...mockApproval, status: 'approved', resolution: 'approved' });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const result = await approvalService.resolveByToken(rawToken, 'approved');

      expect(result.status).toBe('approved');
      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'approved' },
      });
    });

    it('should trigger n8n workflow on approval', async () => {
      const rawToken = 'raw-test-token';
      const hashed = hashToken(rawToken);
      mockPrisma.approvalQueue.findFirst.mockResolvedValue({ ...mockApproval, actionToken: hashed });
      mockPrisma.approvalQueue.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      await approvalService.resolveByToken(rawToken, 'approved');

      // triggerWorkflow is called with .catch() so it may be async
      expect(mockTriggerWorkflow).toHaveBeenCalledWith('mkt-106', { contentPieceId: 'cp-1' });
    });

    it('should set content piece to draft on rejection', async () => {
      const rawToken = 'raw-test-token';
      const hashed = hashToken(rawToken);
      mockPrisma.approvalQueue.findFirst.mockResolvedValue({ ...mockApproval, actionToken: hashed });
      mockPrisma.approvalQueue.update.mockResolvedValue({ ...mockApproval, status: 'rejected' });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      await approvalService.resolveByToken(rawToken, 'rejected');

      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'draft' },
      });
      expect(mockTriggerWorkflow).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND for invalid token', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(null);

      await expect(approvalService.resolveByToken('bad-token', 'approved')).rejects.toThrow(AppError);
    });

    it('should throw ALREADY_RESOLVED for non-pending approval', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue({ ...mockApproval, status: 'approved' });

      try {
        await approvalService.resolveByToken('token', 'approved');
      } catch (err) {
        expect((err as AppError).code).toBe('ALREADY_RESOLVED');
      }
    });

    it('should throw TOKEN_EXPIRED for expired token', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue({
        ...mockApproval,
        tokenExpiresAt: new Date(Date.now() - 3600_000),
      });

      try {
        await approvalService.resolveByToken('token', 'approved');
      } catch (err) {
        expect((err as AppError).code).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('resolveById', () => {
    it('should resolve by ID with resolvedBy', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(mockApproval);
      mockPrisma.approvalQueue.update.mockResolvedValue({
        ...mockApproval,
        status: 'approved',
        resolvedBy: 'user-1',
      });
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const result = await approvalService.resolveById('aq-1', 'approved', 'user-1');

      expect(result.resolvedBy).toBe('user-1');
      expect(mockPrisma.approvalQueue.update).toHaveBeenCalledWith({
        where: { id: 'aq-1' },
        data: expect.objectContaining({ resolvedBy: 'user-1' }),
      });
    });

    it('should throw NOT_FOUND for missing/already resolved approval', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(null);

      await expect(approvalService.resolveById('missing', 'approved', 'user-1')).rejects.toThrow(AppError);
    });
  });

  describe('listApprovals', () => {
    it('should list all approvals', async () => {
      mockPrisma.approvalQueue.findMany.mockResolvedValue([mockApproval]);

      const result = await approvalService.listApprovals();

      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrisma.approvalQueue.findMany.mockResolvedValue([]);

      await approvalService.listApprovals({ status: 'pending' });

      expect(mockPrisma.approvalQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });
  });

  describe('getApprovalById', () => {
    it('should return approval', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(mockApproval);

      const result = await approvalService.getApprovalById('aq-1');

      expect(result.id).toBe('aq-1');
    });

    it('should throw NOT_FOUND', async () => {
      mockPrisma.approvalQueue.findFirst.mockResolvedValue(null);

      await expect(approvalService.getApprovalById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('processReminders', () => {
    it('should send reminders for stale approvals', async () => {
      const staleApproval = {
        ...mockApproval,
        reminderCount: 0,
        updatedAt: new Date(Date.now() - 48 * 3600_000),
      };
      mockPrisma.approvalQueue.findMany.mockResolvedValue([staleApproval]);
      mockPrisma.platformUser.findFirst.mockResolvedValue(mockUser);
      mockPrisma.approvalQueue.update.mockResolvedValue({});

      const results = await approvalService.processReminders();

      expect(results).toHaveLength(1);
      expect(results[0].reminded).toBe(true);
      expect(results[0].escalated).toBe(false);
      expect(mockSendSlack).toHaveBeenCalled();
      expect(mockSendApprovalReminderEmail).toHaveBeenCalled();
    });

    it('should escalate after max reminders', async () => {
      const escalatedApproval = {
        ...mockApproval,
        reminderCount: 2, // MAX_REMINDERS - 1 = 2
        updatedAt: new Date(Date.now() - 100 * 3600_000),
      };
      mockPrisma.approvalQueue.findMany.mockResolvedValue([escalatedApproval]);
      mockPrisma.approvalQueue.update.mockResolvedValue({});

      const results = await approvalService.processReminders();

      expect(results).toHaveLength(1);
      expect(results[0].escalated).toBe(true);
      expect(mockSendSlack).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('escalade'),
        }),
      );
    });

    it('should return empty array when no stale approvals', async () => {
      mockPrisma.approvalQueue.findMany.mockResolvedValue([]);

      const results = await approvalService.processReminders();

      expect(results).toEqual([]);
    });
  });
});
