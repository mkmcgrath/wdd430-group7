import { describe, expect, it } from 'vitest';
import { statsDtoSchema, statsQuerySchema } from './stats.js';

describe('statsQuerySchema', () => {
  it('defaults to range=30d and mode=all (FR-STATS-5)', () => {
    expect(statsQuerySchema.parse({})).toEqual({ range: '30d', mode: 'all' });
  });

  it('accepts every documented range and mode', () => {
    for (const range of ['7d', '30d', 'all']) {
      for (const mode of ['all', 'solo', 'duel']) {
        expect(statsQuerySchema.safeParse({ range, mode }).success).toBe(true);
      }
    }
  });

  it('rejects unknown values', () => {
    expect(statsQuerySchema.safeParse({ range: '1y' }).success).toBe(false);
    expect(statsQuerySchema.safeParse({ mode: 'DUEL' }).success).toBe(false);
  });
});

describe('statsDtoSchema', () => {
  const emptyStats = {
    range: '30d',
    mode: 'all',
    summary: {
      totalRaces: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      bestWpm: null,
      avgWpmLast10: null,
      avgAccuracy: null,
    },
    trend: [],
  };

  it('accepts the empty state', () => {
    expect(statsDtoSchema.parse(emptyStats)).toEqual(emptyStats);
  });

  it('accepts trend points', () => {
    const stats = {
      ...emptyStats,
      summary: {
        ...emptyStats.summary,
        totalRaces: 1,
        bestWpm: 60,
        avgWpmLast10: 60,
        avgAccuracy: 0.9,
      },
      trend: [
        {
          raceId: '6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f',
          startedAt: '2026-11-28T18:22:10.000Z',
          wpm: 60,
          accuracy: 0.9,
          mode: 'SOLO',
          rollingAvgWpm: 60,
        },
      ],
    };
    expect(statsDtoSchema.safeParse(stats).success).toBe(true);
  });

  it('rejects more than 200 trend points', () => {
    const point = {
      raceId: '6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f',
      startedAt: '2026-11-28T18:22:10.000Z',
      wpm: 60,
      accuracy: 0.9,
      mode: 'SOLO',
      rollingAvgWpm: 60,
    };
    const stats = { ...emptyStats, trend: Array.from({ length: 201 }, () => point) };
    expect(statsDtoSchema.safeParse(stats).success).toBe(false);
  });

  it('rejects negative counts', () => {
    const stats = { ...emptyStats, summary: { ...emptyStats.summary, wins: -1 } };
    expect(statsDtoSchema.safeParse(stats).success).toBe(false);
  });
});
