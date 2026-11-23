import { z } from 'zod';
import {
  HISTORY_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_STORED_WPM,
  MAX_WPM_SAMPLES,
  STATS_MODES,
} from '../constants.js';
import { paginatedSchema } from '../types/result.js';
import {
  displayNameSchema,
  isoDateTimeSchema,
  participantStatusSchema,
  raceModeSchema,
  raceResultSchema,
  uuidSchema,
} from './common.js';
import { passageDtoSchema } from './passage.js';

/** One point on the WPM-over-time graph. `t` is seconds since race start. */
export const wpmSampleSchema = z.object({
  t: z.number().min(0),
  wpm: z.number().min(0),
});

export const wpmSamplesSchema = z.array(wpmSampleSchema).max(MAX_WPM_SAMPLES);

const wpmValueSchema = z.number().min(0).max(MAX_STORED_WPM);
const accuracyValueSchema = z.number().min(0).max(1);

/**
 * `POST /practice-results` body (§13.3). The server also checks
 * `totalKeystrokes >= passage.charCount` and the plausibility cap, which need the passage.
 */
export const practiceResultInputSchema = z
  .object({
    passageId: uuidSchema,
    durationMs: z.int().positive(),
    totalKeystrokes: z.int().min(0),
    errorKeystrokes: z.int().min(0),
    wpmSamples: wpmSamplesSchema,
  })
  .refine((v) => v.errorKeystrokes <= v.totalKeystrokes, {
    error: 'errorKeystrokes must not exceed totalKeystrokes',
    path: ['errorKeystrokes'],
  });

export const practiceResultResponseSchema = z.object({ raceId: uuidSchema });

export const participantDtoSchema = z.object({
  displayName: displayNameSchema,
  isGuest: z.boolean(),
  place: z.int().min(1).nullable(),
  result: raceResultSchema.nullable(),
  status: participantStatusSchema,
  wpm: wpmValueSchema,
  accuracy: accuracyValueSchema,
  durationMs: z.int().positive(),
  wpmSamples: wpmSamplesSchema,
});

export const raceDetailDtoSchema = z.object({
  id: uuidSchema,
  mode: raceModeSchema,
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema,
  passage: passageDtoSchema.pick({ id: true, text: true, source: true, difficulty: true }),
  participants: z.array(participantDtoSchema),
});

/** `GET /races/:id` params. */
export const raceIdParamsSchema = z.object({ id: uuidSchema });

export const raceHistoryItemDtoSchema = z.object({
  raceId: uuidSchema,
  mode: raceModeSchema,
  startedAt: isoDateTimeSchema,
  opponentName: displayNameSchema.nullable(),
  wpm: wpmValueSchema,
  accuracy: accuracyValueSchema,
  result: raceResultSchema.nullable(),
  status: participantStatusSchema,
});

export const raceHistoryPageSchema = paginatedSchema(raceHistoryItemDtoSchema);

/** `GET /me/races` query (§13.2). Query strings arrive as text, so numbers are coerced. */
export const myRacesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(HISTORY_PAGE_SIZE),
  mode: z.enum(STATS_MODES).default('all'),
});

export type WpmSample = z.infer<typeof wpmSampleSchema>;
export type PracticeResultInput = z.infer<typeof practiceResultInputSchema>;
export type PracticeResultResponse = z.infer<typeof practiceResultResponseSchema>;
export type ParticipantDTO = z.infer<typeof participantDtoSchema>;
export type RaceDetailDTO = z.infer<typeof raceDetailDtoSchema>;
export type RaceIdParams = z.infer<typeof raceIdParamsSchema>;
export type RaceHistoryItemDTO = z.infer<typeof raceHistoryItemDtoSchema>;
export type MyRacesQuery = z.infer<typeof myRacesQuerySchema>;
