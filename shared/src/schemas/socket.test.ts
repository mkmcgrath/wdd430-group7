import { describe, expect, it } from 'vitest';
import {
  joinedRoomSchema,
  playerReadyPayloadSchema,
  progressPayloadSchema,
  roomCreatePayloadSchema,
  roomJoinPayloadSchema,
  roomSnapshotSchema,
  type RoomSnapshot,
  type RoomSnapshotOf,
} from './socket.js';

const passage = {
  id: '6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f',
  text: 'The quick brown fox.',
  source: 'Team',
  difficulty: 'EASY',
  charCount: 20,
};

const seatA = {
  seatId: 'A',
  displayName: 'speedy_kim',
  isGuest: false,
  ready: true,
  connection: 'connected',
  graceEndsAt: null,
};
const seatB = { ...seatA, seatId: 'B', displayName: 'guest_bo', isGuest: true };

const base = { code: 'ABC234', seats: [seatA, seatB], serverNow: 1_764_000_000_000 };

describe('roomSnapshotSchema', () => {
  it('accepts every phase', () => {
    const snapshots = [
      { ...base, seats: [seatA], phase: 'waiting' },
      { ...base, phase: 'lobby' },
      { ...base, phase: 'countdown', passage, startsAt: base.serverNow + 3000 },
      {
        ...base,
        phase: 'racing',
        passage,
        startedAt: base.serverNow,
        endsAt: base.serverNow + 180_000,
        progress: { A: { position: 5, wpm: 40, finished: false } },
      },
      {
        ...base,
        phase: 'results',
        passage,
        results: {
          raceId: null,
          participants: [
            {
              seatId: 'A',
              displayName: 'speedy_kim',
              isGuest: false,
              place: 1,
              result: 'WIN',
              status: 'FINISHED',
              wpm: 70,
              accuracy: 0.98,
              durationMs: 30_000,
              wpmSamples: [{ t: 1, wpm: 60 }],
            },
          ],
        },
        rematchRequestedBy: ['B'],
      },
    ];
    for (const snapshot of snapshots) {
      expect(roomSnapshotSchema.safeParse(snapshot).success).toBe(true);
    }
  });

  it('rejects phase-specific fields missing (countdown without startsAt)', () => {
    expect(roomSnapshotSchema.safeParse({ ...base, phase: 'countdown', passage }).success).toBe(
      false,
    );
  });

  it('rejects an unknown phase', () => {
    expect(roomSnapshotSchema.safeParse({ ...base, phase: 'paused' }).success).toBe(false);
  });

  it('rejects place values other than 1 or 2', () => {
    const result = roomSnapshotSchema.safeParse({
      ...base,
      phase: 'results',
      passage,
      rematchRequestedBy: [],
      results: {
        raceId: null,
        participants: [
          {
            seatId: 'A',
            displayName: 'x_y_z',
            isGuest: true,
            place: 3,
            result: 'LOSS',
            status: 'DNF',
            wpm: 10,
            accuracy: 1,
            durationMs: 180_000,
            wpmSamples: [],
          },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('narrows by phase with RoomSnapshotOf', () => {
    const snapshot: RoomSnapshot = roomSnapshotSchema.parse({
      ...base,
      phase: 'countdown',
      passage,
      startsAt: 1,
    });
    const startsAt = (s: RoomSnapshotOf<'countdown'>): number => s.startsAt;
    expect(snapshot.phase === 'countdown' ? startsAt(snapshot) : null).toBe(1);
  });
});

describe('joinedRoomSchema', () => {
  it('accepts a join ack payload', () => {
    const joined = { seatId: 'A', seatToken: 'tok', room: { ...base, phase: 'lobby' } };
    expect(joinedRoomSchema.safeParse(joined).success).toBe(true);
  });
});

describe('client → server payloads', () => {
  it('room:create accepts an optional valid nickname', () => {
    expect(roomCreatePayloadSchema.safeParse({}).success).toBe(true);
    expect(roomCreatePayloadSchema.safeParse({ nickname: 'guest_bo' }).success).toBe(true);
    expect(roomCreatePayloadSchema.safeParse({ nickname: 'no' }).success).toBe(false);
  });

  it('room:join normalises the code and accepts an optional seat token', () => {
    expect(roomJoinPayloadSchema.parse({ code: ' abc234 ', seatToken: 'tok' })).toEqual({
      code: 'ABC234',
      seatToken: 'tok',
    });
    expect(roomJoinPayloadSchema.safeParse({ code: 'nope' }).success).toBe(false);
    expect(roomJoinPayloadSchema.safeParse({ code: 'ABC234', seatToken: '' }).success).toBe(false);
  });

  it('player:ready requires a boolean', () => {
    expect(playerReadyPayloadSchema.safeParse({ ready: true }).success).toBe(true);
    expect(playerReadyPayloadSchema.safeParse({ ready: 'yes' }).success).toBe(false);
  });

  it('race:progress requires non-negative integers with errors ≤ total', () => {
    expect(
      progressPayloadSchema.safeParse({ position: 10, totalKeystrokes: 12, errorKeystrokes: 2 })
        .success,
    ).toBe(true);
    expect(
      progressPayloadSchema.safeParse({ position: -1, totalKeystrokes: 12, errorKeystrokes: 2 })
        .success,
    ).toBe(false);
    expect(
      progressPayloadSchema.safeParse({ position: 1.5, totalKeystrokes: 12, errorKeystrokes: 2 })
        .success,
    ).toBe(false);
    expect(
      progressPayloadSchema.safeParse({ position: 10, totalKeystrokes: 2, errorKeystrokes: 3 })
        .success,
    ).toBe(false);
  });
});
