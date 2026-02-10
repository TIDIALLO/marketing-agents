const defaults = {
  platformUser: {
    id: 'user-1',
    email: 'admin@synap6ia.com',
    passwordHash: '$2b$04$test-hash',
    firstName: 'Admin',
    lastName: 'User',
    role: 'owner',
    refreshToken: null,
    notificationPreferences: { slack: true, email: true, whatsapp: false },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  passwordResetToken: {
    id: 'prt-1',
    userId: 'user-1',
    tokenHash: 'abc123hash',
    expiresAt: new Date(Date.now() + 3600_000),
    usedAt: null,
    createdAt: new Date('2025-01-01'),
  },
};

export function buildPlatformUser(overrides?: Partial<typeof defaults.platformUser>) {
  return { ...defaults.platformUser, ...overrides };
}

export function buildPasswordResetToken(overrides?: Partial<typeof defaults.passwordResetToken>) {
  return { ...defaults.passwordResetToken, ...overrides };
}
