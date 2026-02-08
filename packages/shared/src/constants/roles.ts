import type { Role } from '../types/auth';

export const ROLES: Role[] = ['owner', 'admin', 'editor', 'viewer'];

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export const PERMISSIONS = {
  // Tenant management
  'tenant:manage': ['owner'] as Role[],
  'tenant:branding': ['owner'] as Role[],

  // User management
  'users:invite': ['owner', 'admin'] as Role[],
  'users:manage': ['owner', 'admin'] as Role[],

  // Organization & brands
  'organizations:create': ['owner'] as Role[],
  'brands:create': ['owner', 'admin'] as Role[],
  'brands:edit': ['owner', 'admin', 'editor'] as Role[],
  'brands:view': ['owner', 'admin', 'editor', 'viewer'] as Role[],

  // Content
  'content:create': ['owner', 'admin', 'editor'] as Role[],
  'content:approve': ['owner', 'admin'] as Role[],
  'content:view': ['owner', 'admin', 'editor', 'viewer'] as Role[],

  // Ads
  'ads:create': ['owner', 'admin'] as Role[],
  'ads:approve': ['owner', 'admin'] as Role[],
  'ads:view': ['owner', 'admin', 'editor', 'viewer'] as Role[],

  // Leads
  'leads:manage': ['owner', 'admin', 'editor'] as Role[],
  'leads:view': ['owner', 'admin', 'editor', 'viewer'] as Role[],

  // Analytics
  'analytics:view': ['owner', 'admin', 'editor', 'viewer'] as Role[],

  // Settings
  'settings:social': ['owner', 'admin'] as Role[],
  'settings:notifications': ['owner', 'admin', 'editor', 'viewer'] as Role[],
} as const;

export type Permission = keyof typeof PERMISSIONS;
