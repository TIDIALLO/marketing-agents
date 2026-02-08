import { createHash, randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { sendInvitationEmail } from '../lib/email';

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function create(tenantId: string, data: { name: string; description?: string }) {
  return prisma.organization.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description ?? null,
    },
  });
}

export async function list(tenantId: string) {
  return prisma.organization.findMany({
    where: { tenantId },
    include: {
      _count: { select: { users: true, brands: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(tenantId: string, id: string) {
  const org = await prisma.organization.findFirst({
    where: { id, tenantId },
    include: {
      users: {
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        },
      },
      invitations: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      },
    },
  });
  if (!org) {
    throw new AppError(404, 'NOT_FOUND', 'Organisation introuvable');
  }
  return org;
}

export async function update(
  tenantId: string,
  id: string,
  data: { name?: string; description?: string },
) {
  const org = await prisma.organization.findFirst({ where: { id, tenantId } });
  if (!org) {
    throw new AppError(404, 'NOT_FOUND', 'Organisation introuvable');
  }
  return prisma.organization.update({ where: { id }, data });
}

export async function remove(tenantId: string, id: string) {
  const org = await prisma.organization.findFirst({ where: { id, tenantId } });
  if (!org) {
    throw new AppError(404, 'NOT_FOUND', 'Organisation introuvable');
  }
  await prisma.organization.delete({ where: { id } });
}

export async function invite(
  tenantId: string,
  organizationId: string,
  data: { email: string; role: string },
) {
  const org = await prisma.organization.findFirst({
    where: { id: organizationId, tenantId },
  });
  if (!org) {
    throw new AppError(404, 'NOT_FOUND', 'Organisation introuvable');
  }

  // Check if user is already a member
  const existing = await prisma.organizationUser.findFirst({
    where: {
      organizationId,
      user: { email: data.email },
    },
  });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Cet utilisateur est déjà membre de l\'organisation');
  }

  // Check for pending invitation
  const pendingInvite = await prisma.userInvitation.findFirst({
    where: {
      organizationId,
      email: data.email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingInvite) {
    throw new AppError(409, 'CONFLICT', 'Une invitation est déjà en cours pour cet email');
  }

  const plainToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(plainToken);

  const invitation = await prisma.userInvitation.create({
    data: {
      organizationId,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      tokenHash,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
    },
  });

  const inviteUrl = `${APP_URL}/invite?token=${plainToken}`;
  await sendInvitationEmail(data.email, org.name, inviteUrl);

  return invitation;
}

export async function acceptInvitation(token: string, userId: string) {
  const tokenHash = hashToken(token);

  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });

  if (!invitation) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invitation invalide');
  }
  if (invitation.usedAt) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invitation déjà utilisée');
  }
  if (invitation.expiresAt < new Date()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invitation expirée');
  }

  await prisma.$transaction([
    prisma.organizationUser.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
      },
    }),
    prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return invitation.organization;
}
