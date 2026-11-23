import { z } from 'zod';
import {
  DIFFICULTIES,
  NAME_MAX_LENGTH,
  NAME_REGEX,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  SEAT_IDS,
} from '../constants.js';

export const uuidSchema = z.uuid();

/** ISO-8601 UTC timestamp string, as produced by `Date.prototype.toISOString()`. */
export const isoDateTimeSchema = z.iso.datetime();

/** Guest nickname or registered username (§5.1). */
export const nameSchema = z.string().regex(NAME_REGEX, 'Use 3-20 letters, numbers or underscores');

/** Any display name shown in rooms and results (always a valid name, but don't re-check the regex on output). */
export const displayNameSchema = z.string().min(1).max(NAME_MAX_LENGTH);

const ROOM_CODE_REGEX = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${String(ROOM_CODE_LENGTH)}}$`);

/** Room code input: trimmed and uppercased before validation (FR-HOME-3, §14.2). */
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(ROOM_CODE_REGEX, 'Room codes are 6 letters or numbers');

export const difficultySchema = z.enum(DIFFICULTIES);
export const raceModeSchema = z.enum(['SOLO', 'DUEL']);
export const participantStatusSchema = z.enum(['FINISHED', 'DNF', 'FORFEIT']);
export const raceResultSchema = z.enum(['WIN', 'LOSS', 'DRAW']);
export const seatIdSchema = z.enum(SEAT_IDS);

export type Difficulty = z.infer<typeof difficultySchema>;
export type RaceMode = z.infer<typeof raceModeSchema>;
export type ParticipantStatus = z.infer<typeof participantStatusSchema>;
export type RaceResult = z.infer<typeof raceResultSchema>;
export type SeatId = z.infer<typeof seatIdSchema>;
