import { describe, expect, it } from 'vitest';
import { accuracy, wpm } from './scoring.js';

describe('wpm', () => {
  it('counts 5 characters as one word', () => {
    // 300 chars = 60 words in 1 minute
    expect(wpm(300, 60_000)).toBe(60);
  });

  it('scales with elapsed time', () => {
    expect(wpm(100, 30_000)).toBe(40);
    expect(wpm(50, 120_000)).toBe(5);
  });

  it('returns 0 for zero elapsed time', () => {
    expect(wpm(100, 0)).toBe(0);
  });

  it('returns 0 for negative elapsed time', () => {
    expect(wpm(100, -500)).toBe(0);
  });

  it('returns 0 when nothing has been typed', () => {
    expect(wpm(0, 10_000)).toBe(0);
  });

  it('returns a float, not a rounded value', () => {
    expect(wpm(7, 60_000)).toBeCloseTo(1.4);
  });
});

describe('accuracy', () => {
  it('is 1 when no keystrokes have been made', () => {
    expect(accuracy(0, 0)).toBe(1);
  });

  it('is 1 with no errors', () => {
    expect(accuracy(120, 0)).toBe(1);
  });

  it('is the share of keystrokes that were not errors', () => {
    expect(accuracy(200, 10)).toBe(0.95);
  });

  it('is 0 when every keystroke was an error', () => {
    expect(accuracy(15, 15)).toBe(0);
  });
});
