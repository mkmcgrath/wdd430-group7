import { describe, expect, it } from 'vitest';
import {
  myRacesQuerySchema,
  participantDtoSchema,
  practiceResultInputSchema,
  raceDetailDtoSchema,
  raceHistoryPageSchema,
  raceIdParamsSchema,
} from './race.js';

const UUID = '6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f';

describe('practiceResultInputSchema', () => {
  const input = {
    passageId: UUID,
    durationMs: 45_000,
    totalKeystrokes: 210,
    errorKeystrokes: 6,
    wpmSamples: [
      { t: 1, wpm: 30 },
      { t: 2, wpm: 42.5 },
    ],
  };

  it('accepts a valid result', () => {
    expect(practiceResultInputSchema.parse(input)).toEqual(input);
  });

  it('rejects errorKeystrokes > totalKeystrokes on the errorKeystrokes field', () => {
    const result = practiceResultInputSchema.safeParse({ ...input, errorKeystrokes: 211 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['errorKeystrokes']);
  });

  it.each([0, -1, 1.5])('rejects durationMs = %s', (durationMs) => {
    expect(practiceResultInputSchema.safeParse({ ...input, durationMs }).success).toBe(false);
  });

  it('rejects more than 600 samples', () => {
    const wpmSamples = Array.from({ length: 601 }, (_, t) => ({ t, wpm: 50 }));
    expect(practiceResultInputSchema.safeParse({ ...input, wpmSamples }).success).toBe(false);
  });

  it('accepts exactly 600 samples', () => {
    const wpmSamples = Array.from({ length: 600 }, (_, t) => ({ t, wpm: 50 }));
    expect(practiceResultInputSchema.safeParse({ ...input, wpmSamples }).success).toBe(true);
  });

  it('rejects negative sample values', () => {
    expect(
      practiceResultInputSchema.safeParse({ ...input, wpmSamples: [{ t: -1, wpm: 10 }] }).success,
    ).toBe(false);
    expect(
      practiceResultInputSchema.safeParse({ ...input, wpmSamples: [{ t: 1, wpm: -10 }] }).success,
    ).toBe(false);
  });
});

const participant = {
  displayName: 'speedy_kim',
  isGuest: false,
  place: 1,
  result: 'WIN',
  status: 'FINISHED',
  wpm: 72.4,
  accuracy: 0.97,
  durationMs: 41_200,
  wpmSamples: [{ t: 1, wpm: 60 }],
};

describe('participantDtoSchema', () => {
  it('accepts a duel participant', () => {
    expect(participantDtoSchema.parse(participant)).toEqual(participant);
  });

  it('accepts a solo participant (null place and result)', () => {
    expect(
      participantDtoSchema.safeParse({ ...participant, place: null, result: null }).success,
    ).toBe(true);
  });

  it('rejects wpm above 300 and accuracy above 1', () => {
    expect(participantDtoSchema.safeParse({ ...participant, wpm: 301 }).success).toBe(false);
    expect(participantDtoSchema.safeParse({ ...participant, accuracy: 1.01 }).success).toBe(false);
  });
});

describe('raceDetailDtoSchema', () => {
  const detail = {
    id: UUID,
    mode: 'DUEL',
    startedAt: '2026-11-28T18:22:10.000Z',
    endedAt: '2026-11-28T18:23:00.000Z',
    passage: { id: UUID, text: 'Some text', source: 'Team', difficulty: 'MEDIUM' },
    participants: [participant, { ...participant, place: 2, result: 'LOSS' }],
  };

  it('accepts a race detail', () => {
    expect(raceDetailDtoSchema.parse(detail)).toEqual(detail);
  });

  it('drops passage fields outside the Pick (charCount)', () => {
    const parsed = raceDetailDtoSchema.parse({
      ...detail,
      passage: { ...detail.passage, charCount: 9 },
    });
    expect(parsed.passage).toEqual(detail.passage);
  });

  it('rejects an unknown mode', () => {
    expect(raceDetailDtoSchema.safeParse({ ...detail, mode: 'TRIO' }).success).toBe(false);
  });
});

describe('raceIdParamsSchema', () => {
  it('requires a uuid id', () => {
    expect(raceIdParamsSchema.safeParse({ id: UUID }).success).toBe(true);
    expect(raceIdParamsSchema.safeParse({ id: '42' }).success).toBe(false);
  });
});

describe('raceHistoryPageSchema (Paginated<RaceHistoryItemDTO>)', () => {
  it('accepts a page', () => {
    const page = {
      items: [
        {
          raceId: UUID,
          mode: 'SOLO',
          startedAt: '2026-11-28T18:22:10.000Z',
          opponentName: null,
          wpm: 55,
          accuracy: 0.95,
          result: null,
          status: 'FINISHED',
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    };
    expect(raceHistoryPageSchema.parse(page)).toEqual(page);
  });

  it('accepts an empty page', () => {
    const page = { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };
    expect(raceHistoryPageSchema.safeParse(page).success).toBe(true);
  });
});

describe('myRacesQuerySchema', () => {
  it('applies defaults', () => {
    expect(myRacesQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20, mode: 'all' });
  });

  it('coerces numeric strings from the query string', () => {
    expect(myRacesQuerySchema.parse({ page: '3', pageSize: '10', mode: 'duel' })).toEqual({
      page: 3,
      pageSize: 10,
      mode: 'duel',
    });
  });

  it.each([{ page: '0' }, { page: 'abc' }, { pageSize: '101' }, { mode: 'SOLO' }])(
    'rejects %j',
    (query) => {
      expect(myRacesQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});
