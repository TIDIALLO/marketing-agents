import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '../constants/errors';

describe('ERROR_CODES', () => {
  it('should map VALIDATION_ERROR to 400', () => {
    expect(ERROR_CODES.VALIDATION_ERROR.status).toBe(400);
  });

  it('should map UNAUTHORIZED to 401', () => {
    expect(ERROR_CODES.UNAUTHORIZED.status).toBe(401);
  });

  it('should map NOT_FOUND to 404', () => {
    expect(ERROR_CODES.NOT_FOUND.status).toBe(404);
  });

  it('should map INTERNAL_ERROR to 500', () => {
    expect(ERROR_CODES.INTERNAL_ERROR.status).toBe(500);
  });

  it('should define 13 error codes', () => {
    expect(Object.keys(ERROR_CODES)).toHaveLength(13);
  });

  it('should have French default messages', () => {
    expect(ERROR_CODES.NOT_FOUND.defaultMessage).toBe('Ressource introuvable');
    expect(ERROR_CODES.UNAUTHORIZED.defaultMessage).toBe('Authentification requise');
  });
});
