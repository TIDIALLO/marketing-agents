// ─── Brand Voice Configuration ──────────────────────────────

export interface BrandVoiceConfig {
  tone: string[];
  vocabulary: {
    preferred: string[];
    avoided: string[];
  };
  persona: {
    name: string;
    role: string;
    background: string;
  };
  frameworks: string[];
  languageStyle: {
    formality: 'casual' | 'professional' | 'formal';
    humor: 'none' | 'light' | 'frequent';
    emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
    sentenceLength: 'short' | 'mixed' | 'long';
  };
  examples: {
    good: string[];
    bad: string[];
  };
  platformOverrides?: Partial<Record<string, {
    tone?: string[];
    formality?: 'casual' | 'professional' | 'formal';
    emojiUsage?: 'none' | 'minimal' | 'moderate' | 'heavy';
    maxLength?: number;
  }>>;
}

export interface Brand {
  id: string;
  userId: string;
  name: string;
  brandVoice: BrandVoiceConfig | null;
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

