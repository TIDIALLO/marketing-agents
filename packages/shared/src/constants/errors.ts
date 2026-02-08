import type { ErrorCode } from '../types/api';

export const ERROR_CODES: Record<ErrorCode, { status: number; defaultMessage: string }> = {
  VALIDATION_ERROR: { status: 400, defaultMessage: 'Données invalides' },
  UNAUTHORIZED: { status: 401, defaultMessage: 'Authentification requise' },
  FORBIDDEN: { status: 403, defaultMessage: 'Permissions insuffisantes' },
  NOT_FOUND: { status: 404, defaultMessage: 'Ressource introuvable' },
  CONFLICT: { status: 409, defaultMessage: 'Conflit de données' },
  ALREADY_RESOLVED: { status: 400, defaultMessage: 'Déjà traité' },
  TOKEN_EXPIRED: { status: 400, defaultMessage: 'Token expiré' },
  ALREADY_PUBLISHED: { status: 400, defaultMessage: 'Déjà publié' },
  UNPROCESSABLE_ENTITY: { status: 422, defaultMessage: 'Opération impossible' },
  RATE_LIMITED: { status: 429, defaultMessage: 'Trop de requêtes' },
  INTERNAL_ERROR: { status: 500, defaultMessage: 'Erreur interne du serveur' },
};
