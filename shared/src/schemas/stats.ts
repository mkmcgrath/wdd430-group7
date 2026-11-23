import { z } from 'zod';
import { STATS_MODES, STATS_RANGES, STATS_TREND_MAX_POINTS } from '../constants.js';
import { isoDateTimeSchema, raceModeSchema, uuidSchema } from './common.js';

export const statsRangeSchema = z.enum(STATS_RANGES);
export const statsModeSchema = z.enum(STATS_MODES);

/** `GET /me/stats` query (§13.2, FR-STATS-5 defaults). */
export const statsQuerySchema = z.object({
  range: statsRangeSchema.default('30d'),
  mode: statsModeSchema.default('all'),
});

const nonNegativeInt = z.int().min(0);

export const statsDtoSchema = z.object({
  range: statsRangeSchema,
  mode: statsModeSchema,
  summary: z.object({
    totalRaces: nonNegativeInt,
    wins: nonNegativeInt,
    losses: nonNegativeInt,
    draws: nonNegativeInt,
    bestWpm: z.number().min(0).nullable(),
    avgWpmLast10: z.number().min(0).nullable(),
    avgAccuracy: z.number().min(0).max(1).nullable(),
  }),
  /** Oldest to newest. */
  trend: z
    .array(
      z.object({
        raceId: uuidSchema,
        startedAt: isoDateTimeSchema,
        wpm: z.number().min(0),
        accuracy: z.number().min(0).max(1),
        mode: raceModeSchema,
        rollingAvgWpm: z.number().min(0),
      }),
    )
    .max(STATS_TREND_MAX_POINTS),
});

export type StatsRange = z.infer<typeof statsRangeSchema>;
export type StatsMode = z.infer<typeof statsModeSchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;
export type StatsDTO = z.infer<typeof statsDtoSchema>;
export type StatsTrendPoint = StatsDTO['trend'][number];
