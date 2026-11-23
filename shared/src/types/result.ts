import { z } from 'zod';
import type { ErrorCode } from './errors.js';

/** Success-or-error value used by socket acks and services (§13.1). */
export type Result<T, E extends ErrorCode = ErrorCode> =
  { ok: true; data: T } | { ok: false; error: { code: E; message: string } };

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });

export const err = <E extends ErrorCode>(code: E, message: string): Result<never, E> => ({
  ok: false,
  error: { code, message },
});

/** One page of a list endpoint (§13.1). */
export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

/** Builds the Zod schema for `Paginated<T>` from an item schema. */
export const paginatedSchema = <TItem extends z.ZodType>(item: TItem) =>
  z.object({
    items: z.array(item),
    page: z.int().min(1),
    pageSize: z.int().min(1),
    totalItems: z.int().min(0),
    totalPages: z.int().min(0),
  });
