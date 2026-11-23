/**
 * Gameplay, validation and limit constants (requirements.md §7.5).
 * Never hard-code these values anywhere else; import them from here.
 */

// ---- Race timing (server may override via env for tests; see RaceTimings) ----
export const COUNTDOWN_MS = 3000;
export const RACE_TIME_CAP_MS = 180_000;
export const DISCONNECT_GRACE_MS = 15_000;
export const ROOM_IDLE_TIMEOUT_MS = 600_000;
export const EMPTY_ROOM_TTL_MS = 60_000;

/** The env-overridable timings as one readonly object (§7.5 "Env override" column). */
export type RaceTimings = Readonly<{
  countdownMs: number;
  raceTimeCapMs: number;
  disconnectGraceMs: number;
  roomIdleTimeoutMs: number;
}>;

export const DEFAULT_RACE_TIMINGS: RaceTimings = {
  countdownMs: COUNTDOWN_MS,
  raceTimeCapMs: RACE_TIME_CAP_MS,
  disconnectGraceMs: DISCONNECT_GRACE_MS,
  roomIdleTimeoutMs: ROOM_IDLE_TIMEOUT_MS,
};

// ---- Progress, sampling and plausibility (§7.3) ----
export const PROGRESS_SEND_INTERVAL_MS = 150;
export const SAMPLE_INTERVAL_MS = 1000;
export const MAX_PLAUSIBLE_WPM = 250;
/** Latency tolerance added to elapsed time in the plausibility check. */
export const PLAUSIBILITY_TOLERANCE_MS = 1000;
/** Failed plausibility checks before a participant is flagged in logs. */
export const PLAUSIBILITY_FLAG_THRESHOLD = 5;

// ---- Typing engine (§7.1) ----
export const ERROR_BUFFER_MAX = 10;
/** Characters per "word" in the WPM formula (§4). */
export const CHARS_PER_WORD = 5;

// ---- Rooms (§4, §7.5) ----
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MAX_ROOMS = 500;
export const SEAT_IDS = ['A', 'B'] as const;

// ---- Identity (§5.1) ----
export const NAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
export const NAME_MAX_LENGTH = 20;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt only uses the first 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;

// ---- Passages (§7.6) ----
export const PASSAGE_MIN_CHARS = 100;
export const PASSAGE_MAX_CHARS = 400;
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export const PASSAGE_SOURCE_MAX_LENGTH = 200;

// ---- Persistence limits (§12.3) ----
export const MAX_STORED_WPM = 300;
export const MAX_WPM_SAMPLES = 600;

// ---- History and stats (§6.9, §13.3) ----
export const HISTORY_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const STATS_TREND_MAX_POINTS = 200;
export const STATS_ROLLING_AVG_WINDOW = 5;
export const STATS_AVG_WPM_RECENT_RACES = 10;
export const STATS_RANGES = ['7d', '30d', 'all'] as const;
export const STATS_MODES = ['all', 'solo', 'duel'] as const;

// ---- Rate limits (NFR-SEC-3) ----
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const AUTH_RATE_LIMIT_PER_MIN = 10;
export const API_RATE_LIMIT_PER_MIN = 300;
export const SOCKET_EVENTS_PER_SEC = 20;
export const ROOM_CREATE_PER_MIN = 10;

// ---- Storage keys (§5, FR-ROOM-1) ----
export const NICKNAME_STORAGE_KEY = 'kc_nickname';
export const seatTokenStorageKey = (code: string): string => `kc_seat_${code}`;
export const SESSION_COOKIE_NAME = 'kc_session';
