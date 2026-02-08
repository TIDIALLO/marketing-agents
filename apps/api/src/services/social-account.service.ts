import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { encrypt } from '../lib/encryption';

// ─── Social Accounts ─────────────────────────────────────────

export async function connectSocialAccount(
  tenantId: string,
  data: {
    brandId: string;
    platform: string;
    platformUserId?: string;
    platformUsername?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  },
) {
  // Verify brand belongs to tenant
  const brand = await prisma.brand.findFirst({
    where: { id: data.brandId, tenantId },
  });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }

  // Check if already connected
  const existing = await prisma.socialAccount.findUnique({
    where: {
      brandId_platform: { brandId: data.brandId, platform: data.platform },
    },
  });
  if (existing) {
    throw new AppError(409, 'CONFLICT', `Un compte ${data.platform} est déjà connecté pour cette marque`);
  }

  return prisma.socialAccount.create({
    data: {
      brandId: data.brandId,
      platform: data.platform,
      platformUserId: data.platformUserId ?? null,
      platformUsername: data.platformUsername ?? null,
      accessTokenEncrypted: encrypt(data.accessToken),
      refreshTokenEncrypted: data.refreshToken ? encrypt(data.refreshToken) : null,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
    },
    select: {
      id: true,
      brandId: true,
      platform: true,
      platformUserId: true,
      platformUsername: true,
      status: true,
      tokenExpiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listSocialAccounts(tenantId: string, brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } });
  if (!brand) {
    throw new AppError(404, 'NOT_FOUND', 'Marque introuvable');
  }

  return prisma.socialAccount.findMany({
    where: { brandId },
    select: {
      id: true,
      brandId: true,
      platform: true,
      platformUserId: true,
      platformUsername: true,
      status: true,
      tokenExpiresAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { adAccounts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function disconnectSocialAccount(tenantId: string, id: string) {
  const account = await prisma.socialAccount.findFirst({
    where: { id },
    include: { brand: { select: { tenantId: true } } },
  });
  if (!account || account.brand.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Compte social introuvable');
  }
  await prisma.socialAccount.delete({ where: { id } });
}

// ─── Ad Accounts ─────────────────────────────────────────────

export async function connectAdAccount(
  tenantId: string,
  socialAccountId: string,
  data: {
    platform: string;
    platformAccountId: string;
    name?: string;
    credentials?: string;
  },
) {
  const socialAccount = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId },
    include: { brand: { select: { tenantId: true } } },
  });
  if (!socialAccount || socialAccount.brand.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Compte social introuvable');
  }

  return prisma.adAccount.create({
    data: {
      socialAccountId,
      platform: data.platform,
      platformAccountId: data.platformAccountId,
      name: data.name ?? null,
      credentialsEncrypted: data.credentials ? encrypt(data.credentials) : null,
    },
    select: {
      id: true,
      socialAccountId: true,
      platform: true,
      platformAccountId: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listAdAccounts(tenantId: string, socialAccountId: string) {
  const socialAccount = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId },
    include: { brand: { select: { tenantId: true } } },
  });
  if (!socialAccount || socialAccount.brand.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Compte social introuvable');
  }

  return prisma.adAccount.findMany({
    where: { socialAccountId },
    select: {
      id: true,
      socialAccountId: true,
      platform: true,
      platformAccountId: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function disconnectAdAccount(tenantId: string, id: string) {
  const adAccount = await prisma.adAccount.findFirst({
    where: { id },
    include: {
      socialAccount: {
        include: { brand: { select: { tenantId: true } } },
      },
    },
  });
  if (!adAccount || adAccount.socialAccount.brand.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Compte publicitaire introuvable');
  }
  await prisma.adAccount.delete({ where: { id } });
}
