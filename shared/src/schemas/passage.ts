import { z } from 'zod';
import { PASSAGE_MAX_CHARS, PASSAGE_MIN_CHARS, PASSAGE_SOURCE_MAX_LENGTH } from '../constants.js';
import { difficultySchema, uuidSchema } from './common.js';

/** Printable ASCII only (0x20-0x7E). */
const PRINTABLE_ASCII_REGEX = /^[\x20-\x7E]*$/;

/**
 * Passage text content rules (§7.6): 100-400 chars, printable ASCII,
 * single spaces only, no leading/trailing whitespace. Used by the seed script.
 */
export const passageTextSchema = z
  .string()
  .min(PASSAGE_MIN_CHARS)
  .max(PASSAGE_MAX_CHARS)
  .regex(PRINTABLE_ASCII_REGEX, 'Passage must be printable ASCII only')
  .refine((text) => text === text.trim(), 'Passage must not have leading or trailing spaces')
  .refine((text) => !text.includes('  '), 'Passage must use single spaces only');

export const passageDtoSchema = z.object({
  id: uuidSchema,
  text: z.string().min(1),
  source: z.string().min(1).max(PASSAGE_SOURCE_MAX_LENGTH),
  difficulty: difficultySchema,
  charCount: z.int().positive(),
});

/** `GET /passages/random` query (§13.2). */
export const randomPassageQuerySchema = z.object({
  exclude: uuidSchema.optional(),
  difficulty: difficultySchema.optional(),
});

export type PassageDTO = z.infer<typeof passageDtoSchema>;
export type RandomPassageQuery = z.infer<typeof randomPassageQuerySchema>;
