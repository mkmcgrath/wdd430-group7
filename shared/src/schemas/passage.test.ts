import { describe, expect, it } from 'vitest';
import { passageDtoSchema, passageTextSchema, randomPassageQuerySchema } from './passage.js';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');
const valid = words(30); // 149 chars

describe('passageTextSchema (§7.6 content rules)', () => {
  it('accepts plain, single-spaced ASCII of 100-400 chars', () => {
    expect(passageTextSchema.safeParse(valid).success).toBe(true);
    expect(
      passageTextSchema.safeParse(`"Don't," she said - it's 1818!`.padEnd(100, 'x')).success,
    ).toBe(true);
  });

  it('rejects text shorter than 100 or longer than 400 chars', () => {
    expect(passageTextSchema.safeParse('x'.repeat(99)).success).toBe(false);
    expect(passageTextSchema.safeParse('x'.repeat(100)).success).toBe(true);
    expect(passageTextSchema.safeParse('x'.repeat(400)).success).toBe(true);
    expect(passageTextSchema.safeParse('x'.repeat(401)).success).toBe(false);
  });

  it.each([
    ['em dash', '—'],
    ['curly quote', '“'],
    ['ellipsis', '…'],
    ['newline', '\n'],
    ['tab', '\t'],
  ])('rejects a %s', (_label, char) => {
    expect(passageTextSchema.safeParse(`${valid}${char}end`).success).toBe(false);
  });

  it('rejects double spaces', () => {
    expect(passageTextSchema.safeParse(`${valid}  end`).success).toBe(false);
  });

  it('rejects leading or trailing whitespace', () => {
    expect(passageTextSchema.safeParse(` ${valid}`).success).toBe(false);
    expect(passageTextSchema.safeParse(`${valid} `).success).toBe(false);
  });
});

describe('passageDtoSchema', () => {
  const dto = {
    id: '6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f',
    text: valid,
    source: 'Mary Shelley, Frankenstein (1818)',
    difficulty: 'EASY',
    charCount: valid.length,
  };

  it('accepts a passage', () => {
    expect(passageDtoSchema.parse(dto)).toEqual(dto);
  });

  it('rejects an unknown difficulty', () => {
    expect(passageDtoSchema.safeParse({ ...dto, difficulty: 'EXTREME' }).success).toBe(false);
  });
});

describe('randomPassageQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(randomPassageQuerySchema.parse({})).toEqual({});
  });

  it('accepts exclude and difficulty', () => {
    const q = { exclude: '6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f', difficulty: 'HARD' };
    expect(randomPassageQuerySchema.parse(q)).toEqual(q);
  });

  it('rejects a non-uuid exclude and an unknown difficulty', () => {
    expect(randomPassageQuerySchema.safeParse({ exclude: 'abc' }).success).toBe(false);
    expect(randomPassageQuerySchema.safeParse({ difficulty: 'easy' }).success).toBe(false);
  });
});
