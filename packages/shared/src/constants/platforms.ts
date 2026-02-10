import type { Platform } from '../types/content';

export const PLATFORMS: Platform[] = ['linkedin', 'facebook', 'instagram', 'tiktok', 'twitter'];

// Currently supported platforms with real integrations
export const ACTIVE_PLATFORMS: Platform[] = ['linkedin', 'twitter'];

export const PLATFORM_LIMITS: Record<Platform, { maxChars: number; maxHashtags: number }> = {
  linkedin: { maxChars: 3000, maxHashtags: 5 },
  facebook: { maxChars: 500, maxHashtags: 5 },
  instagram: { maxChars: 2200, maxHashtags: 30 },
  tiktok: { maxChars: 2200, maxHashtags: 10 },
  twitter: { maxChars: 280, maxHashtags: 2 },
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter/X',
};
