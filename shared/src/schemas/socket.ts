import { z } from 'zod';
import {
  displayNameSchema,
  nameSchema,
  participantStatusSchema,
  raceResultSchema,
  roomCodeSchema,
  seatIdSchema,
} from './common.js';
import { passageDtoSchema } from './passage.js';
import { wpmSamplesSchema } from './race.js';

// ---------- Views sent by the server (§14.1) ----------

const epochMsSchema = z.number().int().min(0);

export const seatViewSchema = z.object({
  seatId: seatIdSchema,
  displayName: displayNameSchema,
  isGuest: z.boolean(),
  ready: z.boolean(),
  connection: z.enum(['connected', 'disconnected']),
  /** Epoch ms (server clock) when the grace period ends; null while connected. */
  graceEndsAt: epochMsSchema.nullable(),
});

export const progressViewSchema = z.object({
  position: z.int().min(0),
  wpm: z.number().min(0),
  finished: z.boolean(),
});

export const participantResultSchema = z.object({
  seatId: seatIdSchema,
  displayName: displayNameSchema,
  isGuest: z.boolean(),
  place: z.literal([1, 2]),
  result: raceResultSchema,
  status: participantStatusSchema,
  wpm: z.number().min(0),
  accuracy: z.number().min(0).max(1),
  durationMs: z.int().min(0),
  wpmSamples: wpmSamplesSchema,
});

export const raceResultsSchema = z.object({
  /** null when the duel was not saved (guest-only, or a DB failure: NFR-REL-3). */
  raceId: z.uuid().nullable(),
  participants: z.array(participantResultSchema),
});

const roomBaseSchema = z.object({
  code: z.string(),
  seats: z.array(seatViewSchema),
  serverNow: epochMsSchema,
});

export const roomSnapshotSchema = z.discriminatedUnion('phase', [
  roomBaseSchema.extend({ phase: z.literal('waiting') }),
  roomBaseSchema.extend({ phase: z.literal('lobby') }),
  roomBaseSchema.extend({
    phase: z.literal('countdown'),
    passage: passageDtoSchema,
    startsAt: epochMsSchema,
  }),
  roomBaseSchema.extend({
    phase: z.literal('racing'),
    passage: passageDtoSchema,
    startedAt: epochMsSchema,
    endsAt: epochMsSchema,
    progress: z.partialRecord(seatIdSchema, progressViewSchema),
  }),
  roomBaseSchema.extend({
    phase: z.literal('results'),
    passage: passageDtoSchema,
    results: raceResultsSchema,
    rematchRequestedBy: z.array(seatIdSchema),
  }),
]);

export const joinedRoomSchema = z.object({
  seatId: seatIdSchema,
  seatToken: z.string().min(1),
  room: roomSnapshotSchema,
});

/** Server → client `race:progress` (hot path). */
export const progressBroadcastSchema = progressViewSchema.extend({ seatId: seatIdSchema });

export type SeatView = z.infer<typeof seatViewSchema>;
export type ProgressView = z.infer<typeof progressViewSchema>;
export type ParticipantResult = z.infer<typeof participantResultSchema>;
export type RaceResults = z.infer<typeof raceResultsSchema>;
export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;
export type RoomPhase = RoomSnapshot['phase'];
/** Narrow a snapshot to one phase, e.g. `RoomSnapshotOf<'racing'>`. */
export type RoomSnapshotOf<P extends RoomPhase> = Extract<RoomSnapshot, { phase: P }>;
export type JoinedRoom = z.infer<typeof joinedRoomSchema>;
export type ProgressBroadcast = z.infer<typeof progressBroadcastSchema>;

// ---------- Payloads sent by the client (§14.1); the server Zod-parses every one ----------

export const roomCreatePayloadSchema = z.object({
  nickname: nameSchema.optional(),
});

export const roomJoinPayloadSchema = z.object({
  code: roomCodeSchema,
  nickname: nameSchema.optional(),
  seatToken: z.string().min(1).max(64).optional(),
});

export const playerReadyPayloadSchema = z.object({
  ready: z.boolean(),
});

export const progressPayloadSchema = z
  .object({
    position: z.int().min(0),
    totalKeystrokes: z.int().min(0),
    errorKeystrokes: z.int().min(0),
  })
  .refine((p) => p.errorKeystrokes <= p.totalKeystrokes, {
    error: 'errorKeystrokes must not exceed totalKeystrokes',
    path: ['errorKeystrokes'],
  });

export type RoomCreatePayload = z.infer<typeof roomCreatePayloadSchema>;
/** Shape the client sends (code before trimming/uppercasing). */
export type RoomJoinPayload = z.input<typeof roomJoinPayloadSchema>;
export type PlayerReadyPayload = z.infer<typeof playerReadyPayloadSchema>;
export type ProgressPayload = z.infer<typeof progressPayloadSchema>;
