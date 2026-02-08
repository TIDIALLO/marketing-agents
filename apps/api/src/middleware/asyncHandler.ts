import type { Request, Response, NextFunction, ParamsDictionary } from 'express-serve-static-core';

export function asyncHandler<P = ParamsDictionary>(
  fn: (req: Request<P>, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request<P>, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
