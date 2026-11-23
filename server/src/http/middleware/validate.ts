import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { AppError } from '../errors.js';

/** Zod schemas for the parts of a request a route wants validated. */
export type RequestSchemas = Partial<Record<'body' | 'query' | 'params', z.ZodType>>;

/** The parsed (output) types for each schema that was provided. */
export type Validated<TSchemas extends RequestSchemas> = {
  [K in keyof TSchemas]: TSchemas[K] extends z.ZodType ? z.output<TSchemas[K]> : never;
};

export type ValidatedLocals<TSchemas extends RequestSchemas> = { validated: Validated<TSchemas> };

/** Response type for handlers that run after `validate(schemas)`. */
export type ValidatedResponse<TSchemas extends RequestSchemas, TBody = unknown> = Response<
  TBody,
  ValidatedLocals<TSchemas>
>;

const PARTS = ['params', 'query', 'body'] as const;

/** First failing field, for `details.field` in the 400 response. */
function fieldOf(error: z.ZodError): Record<string, string> | undefined {
  const path = error.issues[0]?.path;
  return path && path.length > 0 ? { field: path.map(String).join('.') } : undefined;
}

/**
 * Typed request validation middleware (§16.2). Parses `params`, `query` and `body`
 * with the given Zod schemas and stores the results in `res.locals.validated`
 * (Express 5's `req.query` is read-only). Fails with 400 `VALIDATION_ERROR`.
 *
 * @example
 * const schemas = { query: statsQuerySchema };
 * router.get('/me/stats', validate(schemas), (_req, res: ValidatedResponse<typeof schemas>) => {
 *   const { range, mode } = res.locals.validated.query;
 * });
 */
export function validate<TSchemas extends RequestSchemas>(
  schemas: TSchemas,
): RequestHandler<Record<string, string>, unknown, unknown, unknown, ValidatedLocals<TSchemas>> {
  return (req, res, next) => {
    const validated: Partial<Record<(typeof PARTS)[number], unknown>> = {};
    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? 'Invalid request';
        next(new AppError('VALIDATION_ERROR', message, fieldOf(result.error)));
        return;
      }
      validated[part] = result.data;
    }
    // The loop above filled exactly the keys present in `schemas` with their parsed output,
    // which is what Validated<TSchemas> describes; TS can't follow that through the loop.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    res.locals.validated = validated as Validated<TSchemas>;
    next();
  };
}
