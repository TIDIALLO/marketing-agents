import type { Request, Response, NextFunction } from 'express';
import type { Role, Permission } from '@synap6ia/shared';
import { PERMISSIONS } from '@synap6ia/shared';
import { AppError } from '../lib/errors';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user!.role;
    if (!roles.includes(userRole)) {
      return next(new AppError(403, 'FORBIDDEN', 'Permissions insuffisantes pour cette action'));
    }
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user!.role;
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles.includes(userRole)) {
      return next(new AppError(403, 'FORBIDDEN', `Permission requise : ${permission}`));
    }
    next();
  };
}
