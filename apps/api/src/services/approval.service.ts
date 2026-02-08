import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { sendSlackNotification } from '../lib/slack';
import { sendApprovalEmail, sendApprovalReminderEmail } from '../lib/email';
import { triggerWorkflow } from '../lib/n8n';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TOKEN_EXPIRY_HOURS = 72;
const MAX_REMINDERS = 3;
const REMINDER_AFTER_HOURS = 24;

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ─── Submit for Approval (Stories 4.1, 4.2) ──────────────────

export async function submitForApproval(
  tenantId: string,
  entityType: string,
  entityId: string,
  assigneeId?: string,
  priority?: string,
) {
  // Prevent duplicate pending approvals
  const existing = await prisma.approvalQueue.findFirst({
    where: { tenantId, entityType, entityId, status: 'pending' },
  });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Une approbation est déjà en attente pour cet élément');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 3600_000);

  const approval = await prisma.approvalQueue.create({
    data: {
      tenantId,
      entityType,
      entityId,
      assigneeId: assigneeId ?? null,
      status: 'pending',
      priority: priority ?? 'normal',
      actionToken: hashToken(rawToken),
      tokenExpiresAt,
    },
  });

  // Build action URLs (raw token in URL, hashed in DB)
  const approveUrl = `${APP_URL}/api/approval/resolve/${rawToken}?action=approved`;
  const rejectUrl = `${APP_URL}/api/approval/resolve/${rawToken}?action=rejected`;

  // Send notifications for content pieces
  if (entityType === 'content_piece') {
    const piece = await prisma.contentPiece.findFirst({
      where: { id: entityId, tenantId },
      include: { brand: { select: { name: true } } },
    });

    if (piece) {
      // Story 4.1: Slack notification with preview + action buttons
      await sendSlackNotification({
        text: `Approbation requise : "${piece.title}" (${piece.platform}) — ${piece.brand.name}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: 'Approbation requise' } },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${piece.title}*\n_${piece.platform} — ${piece.brand.name}_\n\n${piece.body.slice(0, 500)}${piece.body.length > 500 ? '...' : ''}`,
            },
          },
          ...(piece.mediaUrl
            ? [{ type: 'section', text: { type: 'mrkdwn', text: `<${piece.mediaUrl}|Voir le visuel>` } }]
            : []),
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: 'Approuver' }, style: 'primary', url: approveUrl, action_id: 'approve_content' },
              { type: 'button', text: { type: 'plain_text', text: 'Rejeter' }, style: 'danger', url: rejectUrl, action_id: 'reject_content' },
            ],
          },
        ],
      });

      // Story 4.2: Email notification with action links
      if (assigneeId) {
        const assignee = await prisma.platformUser.findFirst({
          where: { id: assigneeId },
          select: { email: true, notificationPreferences: true },
        });
        if (assignee) {
          const prefs = assignee.notificationPreferences as Record<string, boolean> | null;
          if (prefs?.email !== false) {
            await sendApprovalEmail(assignee.email, {
              title: piece.title,
              platform: piece.platform,
              brandName: piece.brand.name,
              bodyPreview: piece.body.slice(0, 300),
              approveUrl,
              rejectUrl,
            });
          }
        }
      }
    }
  }

  return approval;
}

// ─── Resolve by Token (Story 4.2 — public, no auth) ─────────

export async function resolveByToken(rawToken: string, action: string) {
  const tokenHash = hashToken(rawToken);

  const approval = await prisma.approvalQueue.findFirst({
    where: { actionToken: tokenHash },
  });
  if (!approval) throw new AppError(404, 'NOT_FOUND', "Token d'approbation invalide");
  if (approval.status !== 'pending') throw new AppError(400, 'ALREADY_RESOLVED', 'Cette approbation a déjà été traitée');
  if (approval.tokenExpiresAt && approval.tokenExpiresAt < new Date()) {
    throw new AppError(400, 'TOKEN_EXPIRED', "Ce lien d'approbation a expiré");
  }

  const resolution = action === 'approved' ? 'approved' : 'rejected';

  const updated = await prisma.approvalQueue.update({
    where: { id: approval.id },
    data: { status: resolution, resolution, resolvedAt: new Date() },
  });

  // Update content piece status + trigger adaptation if approved
  if (approval.entityType === 'content_piece') {
    await prisma.contentPiece.update({
      where: { id: approval.entityId },
      data: { status: resolution === 'approved' ? 'approved' : 'draft' },
    });

    if (resolution === 'approved') {
      triggerWorkflow('mkt-106', {
        contentPieceId: approval.entityId,
        tenantId: approval.tenantId,
      }).catch((err) => console.error('[n8n] MKT-106 trigger failed:', err));
    }
  }

  return updated;
}

// ─── Resolve by ID (authenticated) ──────────────────────────

export async function resolveById(
  tenantId: string,
  approvalId: string,
  action: string,
  resolvedBy: string,
) {
  const approval = await prisma.approvalQueue.findFirst({
    where: { id: approvalId, tenantId, status: 'pending' },
  });
  if (!approval) throw new AppError(404, 'NOT_FOUND', 'Approbation introuvable ou déjà traitée');

  const resolution = action === 'approved' ? 'approved' : 'rejected';

  const updated = await prisma.approvalQueue.update({
    where: { id: approvalId },
    data: { status: resolution, resolution, resolvedAt: new Date(), resolvedBy },
  });

  if (approval.entityType === 'content_piece') {
    await prisma.contentPiece.update({
      where: { id: approval.entityId },
      data: { status: resolution === 'approved' ? 'approved' : 'draft' },
    });

    if (resolution === 'approved') {
      triggerWorkflow('mkt-106', {
        contentPieceId: approval.entityId,
        tenantId,
      }).catch((err) => console.error('[n8n] MKT-106 trigger failed:', err));
    }
  }

  return updated;
}

// ─── List & Get ──────────────────────────────────────────────

export async function listApprovals(
  tenantId: string,
  filters?: { status?: string; entityType?: string },
) {
  return prisma.approvalQueue.findMany({
    where: {
      tenantId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
    },
    orderBy: [{ createdAt: 'asc' }],
  });
}

export async function getApprovalById(tenantId: string, id: string) {
  const approval = await prisma.approvalQueue.findFirst({ where: { id, tenantId } });
  if (!approval) throw new AppError(404, 'NOT_FOUND', 'Approbation introuvable');
  return approval;
}

// ─── Reminder System (Story 4.3) ────────────────────────────

export async function processReminders() {
  const cutoff = new Date(Date.now() - REMINDER_AFTER_HOURS * 3600_000);

  const staleApprovals = await prisma.approvalQueue.findMany({
    where: {
      status: 'pending',
      reminderCount: { lt: MAX_REMINDERS },
      updatedAt: { lt: cutoff },
    },
  });

  const results: { id: string; reminded: boolean; escalated: boolean }[] = [];

  for (const approval of staleApprovals) {
    const isLastReminder = approval.reminderCount >= MAX_REMINDERS - 1;

    if (isLastReminder) {
      // Escalate to admin
      await sendSlackNotification({
        text: `Approbation bloquée depuis ${MAX_REMINDERS * REMINDER_AFTER_HOURS}h — escalade admin requise (${approval.entityType}: ${approval.entityId})`,
      });

      await prisma.approvalQueue.update({
        where: { id: approval.id },
        data: { reminderCount: { increment: 1 } },
      });

      results.push({ id: approval.id, reminded: true, escalated: true });
    } else {
      // Send reminder to assignee
      if (approval.assigneeId) {
        const assignee = await prisma.platformUser.findFirst({
          where: { id: approval.assigneeId },
          select: { email: true, notificationPreferences: true },
        });

        if (assignee) {
          const prefs = assignee.notificationPreferences as Record<string, boolean> | null;
          const hoursWaiting = (approval.reminderCount + 1) * REMINDER_AFTER_HOURS;

          if (prefs?.slack !== false) {
            await sendSlackNotification({
              text: `Relance : approbation en attente depuis ${hoursWaiting}h (${approval.entityType}: ${approval.entityId})`,
            });
          }

          if (prefs?.email !== false) {
            await sendApprovalReminderEmail(assignee.email, {
              entityType: approval.entityType,
              entityId: approval.entityId,
              hoursWaiting,
              dashboardUrl: `${APP_URL}/approvals/${approval.id}`,
            });
          }
        }
      }

      await prisma.approvalQueue.update({
        where: { id: approval.id },
        data: { reminderCount: { increment: 1 } },
      });

      results.push({ id: approval.id, reminded: true, escalated: false });
    }
  }

  return results;
}
