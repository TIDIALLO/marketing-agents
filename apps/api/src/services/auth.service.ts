import { createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { AppError } from '../lib/errors';
import type { JwtPayload, Role } from '@synap6ia/shared';

const BCRYPT_ROUNDS = 12;

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user: {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

function buildJwtPayload(user: {
  id: string;
  tenantId: string;
  role: string;
  email: string;
}): JwtPayload {
  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role as Role,
    email: user.email,
  };
}

export async function register({
  email,
  password,
  firstName,
  lastName,
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const existing = await prisma.platformUser.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Un compte avec cet email existe déjà');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: {} });

      const user = await tx.platformUser.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'owner',
        },
      });

      const refreshToken = generateRefreshToken(user.id);
      await tx.platformUser.update({
        where: { id: user.id },
        data: { refreshToken: hashRefreshToken(refreshToken) },
      });

      return { user, refreshToken };
    });

    const { user, refreshToken } = result;
    const accessToken = generateAccessToken(buildJwtPayload(user));

    return { user: sanitizeUser(user), accessToken, refreshToken };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'CONFLICT', 'Un compte avec cet email existe déjà');
    }
    throw err;
  }
}

export async function login({ email, password }: { email: string; password: string }) {
  const user = await prisma.platformUser.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Email ou mot de passe incorrect');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'UNAUTHORIZED', 'Email ou mot de passe incorrect');
  }

  const accessToken = generateAccessToken(buildJwtPayload(user));
  const refreshToken = generateRefreshToken(user.id);

  await prisma.platformUser.update({
    where: { id: user.id },
    data: { refreshToken: hashRefreshToken(refreshToken) },
  });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refresh(refreshTokenValue: string) {
  let decoded: { userId: string };
  try {
    decoded = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token invalide ou expiré');
  }

  const user = await prisma.platformUser.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || !user.refreshToken) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token invalide');
  }

  if (hashRefreshToken(refreshTokenValue) !== user.refreshToken) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token invalide');
  }

  const accessToken = generateAccessToken(buildJwtPayload(user));

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken(user.id);
  await prisma.platformUser.update({
    where: { id: user.id },
    data: { refreshToken: hashRefreshToken(newRefreshToken) },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string) {
  await prisma.platformUser.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}
