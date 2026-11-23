import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET } from '../constants.js';
import { nameSchema, roomCodeSchema, seatIdSchema, uuidSchema } from './common.js';

describe('nameSchema', () => {
  it.each(['abc', 'speedy_kim', 'A1_b2_C3', 'x'.repeat(20)])('accepts %s', (name) => {
    expect(nameSchema.safeParse(name).success).toBe(true);
  });

  it.each(['ab', 'x'.repeat(21), 'has space', 'dash-name', 'émile', ''])('rejects %j', (name) => {
    expect(nameSchema.safeParse(name).success).toBe(false);
  });
});

describe('roomCodeSchema', () => {
  it('trims and uppercases before validating (FR-HOME-3)', () => {
    expect(roomCodeSchema.parse('  abc234 ')).toBe('ABC234');
  });

  it('accepts every character of the alphabet', () => {
    const code = ROOM_CODE_ALPHABET.slice(0, 6);
    expect(roomCodeSchema.parse(code)).toBe(code);
  });

  it.each(['ABC23', 'ABC2345', 'ABC20O', 'ABCD1I', 'ABCDEL', 'ABC 23', ''])(
    'rejects %j',
    (code) => {
      expect(roomCodeSchema.safeParse(code).success).toBe(false);
    },
  );
});

describe('seatIdSchema', () => {
  it('accepts A and B only', () => {
    expect(seatIdSchema.safeParse('A').success).toBe(true);
    expect(seatIdSchema.safeParse('B').success).toBe(true);
    expect(seatIdSchema.safeParse('C').success).toBe(false);
    expect(seatIdSchema.safeParse('a').success).toBe(false);
  });
});

describe('uuidSchema', () => {
  it('accepts a v4 uuid and rejects garbage', () => {
    expect(uuidSchema.safeParse('6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f').success).toBe(true);
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('123').success).toBe(false);
  });
});
