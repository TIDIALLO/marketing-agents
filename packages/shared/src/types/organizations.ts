import type { Role } from './auth';

export interface Organization {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUser {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

export interface UserInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
}

export interface InviteUserRequest {
  email: string;
  role: Role;
}
