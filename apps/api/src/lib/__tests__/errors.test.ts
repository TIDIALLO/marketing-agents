import { describe, it, expect } from 'vitest';
import { AppError } from '../errors';

describe('AppError', () => {
  it('should create an error with statusCode, code, and message', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Ressource introuvable');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Ressource introuvable');
    expect(err.name).toBe('AppError');
    expect(err.details).toBeUndefined();
  });

  it('should include optional details', () => {
    const details = [{ field: 'email', message: 'Email invalide' }];
    const err = new AppError(400, 'VALIDATION_ERROR', 'Données invalides', details);
    expect(err.details).toEqual(details);
  });

  it('should have a proper stack trace', () => {
    const err = new AppError(500, 'INTERNAL_ERROR', 'Erreur interne');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError');
  });

  it('should work with different error codes', () => {
    const codes = ['UNAUTHORIZED', 'FORBIDDEN', 'CONFLICT', 'RATE_LIMITED'] as const;
    for (const code of codes) {
      const err = new AppError(400, code, `Test ${code}`);
      expect(err.code).toBe(code);
    }
  });
});
