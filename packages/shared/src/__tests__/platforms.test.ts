import { describe, it, expect } from 'vitest';
import { PLATFORMS, ACTIVE_PLATFORMS, PLATFORM_LIMITS, PLATFORM_LABELS } from '../constants/platforms';

describe('PLATFORMS', () => {
  it('should list all 5 platforms', () => {
    expect(PLATFORMS).toHaveLength(5);
    expect(PLATFORMS).toContain('linkedin');
    expect(PLATFORMS).toContain('twitter');
  });
});

describe('ACTIVE_PLATFORMS', () => {
  it('should contain only linkedin and twitter', () => {
    expect(ACTIVE_PLATFORMS).toEqual(['linkedin', 'twitter']);
  });
});

describe('PLATFORM_LIMITS', () => {
  it('should define limits for all platforms', () => {
    for (const platform of PLATFORMS) {
      expect(PLATFORM_LIMITS[platform]).toBeDefined();
      expect(PLATFORM_LIMITS[platform].maxChars).toBeGreaterThan(0);
      expect(PLATFORM_LIMITS[platform].maxHashtags).toBeGreaterThan(0);
    }
  });

  it('should have twitter as shortest at 280 chars', () => {
    expect(PLATFORM_LIMITS.twitter.maxChars).toBe(280);
  });

  it('should have linkedin as longest at 3000 chars', () => {
    expect(PLATFORM_LIMITS.linkedin.maxChars).toBe(3000);
  });
});

describe('PLATFORM_LABELS', () => {
  it('should provide display labels for all platforms', () => {
    expect(PLATFORM_LABELS.linkedin).toBe('LinkedIn');
    expect(PLATFORM_LABELS.twitter).toBe('Twitter/X');
    expect(PLATFORM_LABELS.tiktok).toBe('TikTok');
  });
});
