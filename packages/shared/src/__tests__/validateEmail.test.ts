import { describe, it, expect } from 'vitest';
import { validateEmail, normalizeEmail } from '../utils/validateEmail';

describe('validateEmail', () => {
  it('should return true for valid emails', () => {
    expect(validateEmail('admin@synap6ia.com')).toBe(true);
    expect(validateEmail('user+tag@example.org')).toBe(true);
    expect(validateEmail('  test@test.com  ')).toBe(true);
  });

  it('should return false for invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@missing.local')).toBe(false);
    expect(validateEmail('missing@')).toBe(false);
    expect(validateEmail('missing@.com')).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('should lowercase and trim', () => {
    expect(normalizeEmail('  Admin@Synap6ia.COM  ')).toBe('admin@synap6ia.com');
  });

  it('should handle already normalized emails', () => {
    expect(normalizeEmail('test@test.com')).toBe('test@test.com');
  });
});
