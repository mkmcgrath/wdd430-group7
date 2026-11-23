import { CHARS_PER_WORD } from './constants.js';

const MS_PER_MINUTE = 60_000;

/** Words per minute (§7.2). A "word" is 5 characters. Returns 0 for non-positive elapsed time. */
export function wpm(correctChars: number, elapsedMs: number): number {
  return elapsedMs <= 0 ? 0 : correctChars / CHARS_PER_WORD / (elapsedMs / MS_PER_MINUTE);
}

/** Accuracy from 0 to 1 (§7.2). Returns 1 when nothing has been typed yet. */
export function accuracy(totalKeystrokes: number, errorKeystrokes: number): number {
  return totalKeystrokes === 0 ? 1 : (totalKeystrokes - errorKeystrokes) / totalKeystrokes;
}
