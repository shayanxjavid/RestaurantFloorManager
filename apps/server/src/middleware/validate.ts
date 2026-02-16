import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Request validation middleware factory.
 * Takes a Zod schema and validates req.body against it.
 * On success, replaces req.body with the parsed (and transformed) data.
 * On failure, passes the ZodError to the error handler.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}
