// Authentication & authorization types

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  notificationPreferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  slack: boolean;
  email: boolean;
  whatsapp: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
}
