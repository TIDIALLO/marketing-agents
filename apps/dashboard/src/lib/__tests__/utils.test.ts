import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', 'active');
    expect(result).toBe('base active');
  });

  it('should merge tailwind conflicting classes', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });
});
