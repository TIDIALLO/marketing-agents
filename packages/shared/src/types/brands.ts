export interface Brand {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  brandVoice: unknown | null;
  targetAudience: unknown | null;
  contentGuidelines: unknown | null;
  visualGuidelines: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  brandId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandRequest {
  organizationId: string;
  name: string;
  brandVoice?: string;
  targetAudience?: string;
  contentGuidelines?: string;
  visualGuidelines?: string;
}

export interface CreateProductRequest {
  brandId: string;
  name: string;
  description?: string;
}

export interface SocialAccount {
  id: string;
  brandId: string;
  platform: string;
  platformUserId: string | null;
  platformUsername: string | null;
  status: string;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdAccount {
  id: string;
  socialAccountId: string;
  platform: string;
  platformAccountId: string;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantBranding {
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  customDomain: string | null;
}
