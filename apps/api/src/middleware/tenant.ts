import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    next();
  } catch (err) {
    next(err);
  }
}
