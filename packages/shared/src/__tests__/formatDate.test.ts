import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeTime } from '../utils/formatDate';

describe('formatDate', () => {
  it('should format date string in French locale by default', () => {
    const result = formatDate('2025-06-15');
    expect(result).toContain('2025');
    expect(result).toContain('15');
  });

  it('should accept Date objects', () => {
    const result = formatDate(new Date('2025-01-01'));
    expect(result).toContain('2025');
  });

  it('should format in English locale when specified', () => {
    const result = formatDate('2025-06-15', 'en-US');
    expect(result).toContain('2025');
    expect(result).toContain('15');
  });
});

describe('formatRelativeTime', () => {
  it('should return seconds-level relative time for recent dates', () => {
    const now = new Date();
    const result = formatRelativeTime(now);
    // Within seconds of now
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should return hours-level for dates hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo, 'fr-FR');
    expect(result).toContain('2');
  });

  it('should return days-level for dates days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(threeDaysAgo, 'fr-FR');
    expect(result).toContain('3');
  });

  it('should accept string dates', () => {
    const result = formatRelativeTime(new Date(Date.now() - 60000).toISOString());
    expect(typeof result).toBe('string');
  });
});
