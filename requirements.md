# KeyClashr — Software Requirements Specification

> **Status:** v1.1 — agreed baseline · **Last updated:** 2026-11-21 · **Final due date:** 2026-12-15 (Week 14)
>
> This is the **single source of truth** for what we are building and how. If code and this document disagree, this document wins until it is changed via the process in [§20 Change control](#20-change-control).

---

## Table of contents

0. [How to use this document (humans and AI agents)](#0-how-to-use-this-document-humans-and-ai-agents)
1. [Product overview](#1-product-overview)
2. [Scope: in and out](#2-scope-in-and-out)
3. [Course rubric traceability](#3-course-rubric-traceability)
4. [Glossary](#4-glossary)
5. [Users and identity](#5-users-and-identity)
6. [Functional requirements](#6-functional-requirements)
7. [Gameplay rules and scoring](#7-gameplay-rules-and-scoring)
8. [Race lifecycle state machine](#8-race-lifecycle-state-machine)
9. [System architecture](#9-system-architecture)
10. [Tech stack](#10-tech-stack)
11. [Repository layout](#11-repository-layout)
12. [Data model](#12-data-model)
13. [REST API contract](#13-rest-api-contract)
14. [Socket.IO event contract](#14-socketio-event-contract)
15. [Frontend specification](#15-frontend-specification)
16. [Non-functional requirements](#16-non-functional-requirements)
17. [Testing strategy](#17-testing-strategy)
18. [CI/CD, deployment and environments](#18-cicd-deployment-and-environments)
19. [Documentation deliverables](#19-documentation-deliverables)
20. [Change control](#20-change-control)
21. [Git workflow and conventions](#21-git-workflow-and-conventions)
22. [Milestones and task backlog](#22-milestones-and-task-backlog)
23. [Changelog](#23-changelog)

---

## 0. How to use this document (humans and AI agents)

**Humans:** Read §1–§8 once to understand the product. Before starting a task, read the sections that task references in [§22](#22-milestones-and-task-backlog).

**AI coding agents (any tool: Claude, Copilot, Cursor, ChatGPT, etc.):** If you are reading this, follow these rules. They are not suggestions.

### 0.1 Agent rules

1. **Do not invent scope.** Only build what is described here. If something is ambiguous or missing, stop and ask the human. Do not guess. Features listed as out of scope in [§2.2](#22-out-of-scope-do-not-build) must not be built.
2. **Use the contracts verbatim.** Names, shapes and error codes in [§12](#12-data-model), [§13](#13-rest-api-contract) and [§14](#14-socketio-event-contract) are fixed. Use the exact route paths, event names, field names and constants. Shared types live in `shared/` and are imported by both client and server. Never redefine them locally.
3. **No `any`. Ever.** No `as any`, no `@ts-ignore`, no `@ts-expect-error` without a linked issue, and no non-null assertions (`!`). Use `unknown` plus Zod parsing or type guards. See [§16.2](#162-type-safety-and-code-quality).
4. **Validate every external input with Zod.** That includes HTTP bodies, query params, socket payloads and env vars. Infer TS types from schemas (`z.infer`). Do not write the same type twice.
5. **Every UI that fetches or waits has loading, empty and error states.** No blank screens, no unhandled promise rejections, no 500s leaking stack traces.
6. **Accessibility is not optional.** Use semantic HTML, labelled controls, visible focus, and never use colour as the only signal. See [§16.3](#163-accessibility-wcag-21-aa).
7. **Write tests with the code.** Every PR that adds logic adds or updates unit tests. User-facing flows in [§17.3](#173-end-to-end-tests-playwright) need E2E coverage.
8. **No new runtime dependencies** beyond [§10](#10-tech-stack) without a human approving it and an ADR in `docs/adrs/`.
9. **Keep docs in sync.** If you change an API route, socket event, env var, schema or architecture, update the matching `docs/` file **and** this document in the same PR.
10. **Never commit secrets.** Only `.env.example` with placeholder values is committed.
11. **Prefer small, focused PRs** that map to one task ID from §22. Put the task ID in the branch name and PR title.
12. **Do not modify CI/CD files** (`.github/workflows/**`, `render.yaml`, `e2e/playwright.config.ts`, Render/Neon settings) unless the task is in Track D or the **CI/CD owner** has agreed. If a change seems needed, tell the human. See [§18.0](#180-ownership).

---

## 1. Product overview

**KeyClashr** is a real-time, head-to-head typing race web app. A player creates a private room and shares a link or code with a friend. Both see the same passage, a countdown starts, and they race to type it accurately. Each player watches the opponent's progress update live. At the end, both see results (WPM, accuracy, placement) and a WPM-over-time graph of the race. Players can also practise solo.

Anyone can play as a **guest** with a nickname. Players who **create an account** get their races saved and a **personal stats dashboard** with charts of their progress over time.

### 1.1 Goals

| ID | Goal |
|---|---|
| G1 | Two players in different browsers can complete a live 1v1 typing race with sub-second opponent progress updates. |
| G2 | Results are fair: the **server** decides progress, finish times and WPM (server-authoritative). |
| G3 | Registered users can see their improvement over time through charts. |
| G4 | The app meets the course rubric: strict TS, Lighthouse >90, WCAG 2.1 AA, CI/CD with unit and E2E tests, and complete `/docs`. |
| G5 | Deployed and publicly reachable on Render, with a demo-ready flow. |

### 1.2 Advanced features we are claiming (rubric: "2+ Advanced Features")

1. **WebSockets for real-time updates.** Socket.IO powers live rooms, countdowns, opponent progress and reconnection.
2. **Complex state management.** The client race lifecycle is a typed state machine in Zustand, driven by server events. Server state comes through TanStack Query.
3. **Complex data visualization.** Recharts powers the per-race WPM-over-time graph and the personal stats dashboard (trend lines, accuracy and outcomes), each with accessible table alternatives.

> Note: We use **WebSockets**, not webhooks. Webhooks are server-to-server HTTP callbacks and are not part of this project.

---

## 2. Scope: in and out

### 2.1 In scope (MVP: all required for submission)

- Guest play with a nickname (no account needed).
- Optional account: register, log in, log out (username/email + password).
- Solo practice mode.
- 1v1 private rooms: create room → share code/link → join → lobby → ready-up → countdown → live race → results.
- Live opponent progress bar and WPM.
- Disconnect handling with a 15-second reconnect grace period, then forfeit.
- Rematch within the same room.
- Results screen with WPM-over-time graph for both players.
- Saved race history and **personal stats dashboard** for registered users.
- Curated passage library seeded into the database.
- CI/CD, tests, docs and a Render deployment.

### 2.2 Out of scope (do NOT build)

Public matchmaking/quick-match queues · rooms with more than 2 players · spectators · global leaderboards · public profile pages · themes/dark-mode toggles · custom rooms or custom text · chat · admin roles/RBAC · OAuth/social login · password reset or email verification (we have no email service) · account deletion/editing · PWA/offline mode · i18n · mobile-specific typing optimisations (mobile must not break, but desktop is the target) · horizontal scaling across multiple server instances.

If time remains after M3 (see §22), the team may pick stretch items. Each needs a spec change PR first.

---

## 3. Course rubric traceability

The project is graded on these criteria. Every requirement in this document maps back to one.

| Rubric criterion (weight) | Requirement in this doc |
|---|---|
| Core functionality & reliability (20%) | §6 functional requirements; §6.10 error, empty and loading states; zero broken links/500s (NFR-REL-*) |
| Type safety & quality (15%) | §16.2 strict TS, no `any`, generics and utility types; §11 modular architecture |
| UX, a11y & perf (15%) | §16.1 performance (Lighthouse >90, CLS); §16.3 WCAG 2.1 AA |
| Testing & DevOps (15%) | §17 unit, integration and E2E (Playwright); §18 CI gate and automated deploy |
| Documentation / ADRs (15%) | §19 `/docs` folder, ADRs, README fresh install in <10 min |
| Technical complexity (20%) | §1.2 WebSockets, complex state management, data viz |

Other course requirements:
- Final code on the `main` branch of the GitHub repo.
- README with clear setup instructions.
- Live demo URL.
- A **video demo under 10 minutes** (one per team) covering core features, advanced features, technical choices and challenges, the deployment and the CI/CD pipeline.
- **Week 12:** another group will try to run our app from `docs/setup.md` within 20 minutes.
- **Week 13:** anonymous peer reviews of each member's contributions. Commit history and PRs matter.

---

## 4. Glossary

| Term | Definition |
|---|---|
| **Room** | A temporary, in-memory server object identified by a 6-character **room code**. It holds up to 2 seats. |
| **Seat** | One of two player slots in a room, `A` or `B`. Seat `A` belongs to whoever created the room. |
| **Seat token** | A random secret the server issues on join. It lets a player reclaim their seat after a disconnect or page reload. |
| **Passage** | The text to type. Plain ASCII, 100–400 characters. |
| **Position** | Number of characters of the passage typed **correctly** from the start (the correct prefix length). |
| **Keystroke** | One inserted character (backspaces are not keystrokes). |
| **Error keystroke** | A keystroke that does not match the expected character, or is typed while an uncorrected error exists. |
| **WPM** | Words per minute = (correct characters ÷ 5) ÷ minutes elapsed. A "word" is 5 characters. |
| **Accuracy** | (total keystrokes − error keystrokes) ÷ total keystrokes, from 0–1. Shown as a percentage. |
| **DNF** | Did not finish: the race time cap was reached before the player completed the passage. |
| **Forfeit** | The player disconnected and did not reconnect within the grace period. |
| **Grace period** | 15 s window to reconnect after a disconnect before forfeiting. |
| **Time cap** | Maximum race duration (180 s). |
| **Duel** | A 1v1 race. **Solo** = a practice race with no opponent. |

---

## 5. Users and identity

There are two user types. There are no roles or admin users.

| Type | How | Can do | Data persisted |
|---|---|---|---|
| **Guest** | Enters a nickname (stored in `localStorage` key `kc_nickname`) | Solo practice, create/join rooms, race, see results screen | Nothing tied to them. If a guest races a registered user, the race is saved with the guest's nickname only. |
| **Registered user** | Registers with username + email + password, logs in | Everything a guest can, plus saved history, `/stats` dashboard, saved results pages | Account, sessions, all races they take part in |

### 5.1 Identity rules

- **Nickname (guest)** and **username (registered)** both match `^[A-Za-z0-9_]{3,20}$`.
- Usernames are **unique, case-insensitive** (`Alice` and `alice` conflict). Guest nicknames are not unique.
- In rooms, guests are labelled with a "Guest" badge so a guest can't pass as a registered user.
- Logged-in users race under their username. The nickname input is hidden for them.
- **Email:** valid email format, max 254 chars, stored lowercased, unique.
- **Password:** 8–72 characters (72 is the bcrypt byte limit). No other complexity rules.
- Login accepts **username or email** plus password.
- A registered user may not occupy both seats of the same room (error `ALREADY_IN_ROOM`).

---

## 6. Functional requirements

Requirement IDs are stable. Reference them in PRs, tests and commits.

### 6.1 Home (`/`)

| ID | Requirement |
|---|---|
| FR-HOME-1 | Shows the app name, a one-line description, and three primary actions: **Create a race**, **Join a race** (with a room code input), **Practice solo**. |
| FR-HOME-2 | For guests: a nickname field prefilled from `localStorage`. Create and join are disabled until the nickname is valid, with an inline validation message. Solo practice does not need a nickname. |
| FR-HOME-3 | The room code input is case-insensitive. It is uppercased and trimmed before use. Invalid format shows an inline error and does not navigate. |
| FR-HOME-4 | **Create a race** emits `room:create`. On success it navigates to `/r/:code`. On failure it shows an error message and stays on the page. |
| FR-HOME-5 | **Join** navigates to `/r/:code`. The room page performs the actual join. |

### 6.2 Accounts (`/register`, `/login`)

| ID | Requirement |
|---|---|
| FR-AUTH-1 | Register form: username, email, password, confirm password. Client-side validation uses the shared Zod schema. Server returns `409 CONFLICT` with `details.field` for a taken username or email, shown inline on that field. |
| FR-AUTH-2 | Successful registration logs the user in (sets session cookie) and redirects to `next` query param if it is a safe relative path, else `/`. |
| FR-AUTH-3 | Login form: username-or-email and password. Wrong credentials return a generic "Invalid username/email or password" (do not reveal which). |
| FR-AUTH-4 | Logout is in the header for logged-in users. It calls `POST /api/v1/auth/logout`, clears cached user data, and redirects to `/`. |
| FR-AUTH-5 | On app load, the client calls `GET /api/v1/auth/me` to determine the current user. 401 means guest. This is not an error state. |
| FR-AUTH-6 | Protected pages (`/stats`) redirect guests to `/login?next=<path>`. |
| FR-AUTH-7 | Auth endpoints are rate-limited (see §16.4). A 429 shows "Too many attempts, try again in a minute". |

### 6.3 Solo practice (`/practice`)

| ID | Requirement |
|---|---|
| FR-SOLO-1 | Loads a random passage from `GET /api/v1/passages/random`. Shows a loading skeleton with the same dimensions as the passage to avoid layout shift. |
| FR-SOLO-2 | The timer starts on the **first keystroke** (no countdown). |
| FR-SOLO-3 | Uses the same typing engine as duels (§7.1). Shows live WPM, accuracy and a progress bar. |
| FR-SOLO-4 | On completion, shows results (WPM, accuracy, time) and a WPM-over-time chart, plus **Try another passage** (new passage, excluding the current one) and **Back home**. |
| FR-SOLO-5 | Logged in: the result is submitted to `POST /api/v1/practice-results` and a "Saved to your stats" confirmation shows. On failure, show a non-blocking error with **Retry**. |
| FR-SOLO-6 | Guest: show "Log in or create an account to save your results" with links. Nothing is submitted. |
| FR-SOLO-7 | **Restart** (button and `Esc` key) resets the current passage without submitting. |

### 6.4 Rooms and lobby (`/r/:code`)

| ID | Requirement |
|---|---|
| FR-ROOM-1 | Opening `/r/:code` connects the socket and emits `room:join`. If a seat token for this room exists in `sessionStorage` (`kc_seat_<CODE>`), it is sent so the player reclaims their seat. |
| FR-ROOM-2 | Guests arriving via link with no saved nickname see a nickname prompt before joining. |
| FR-ROOM-3 | Join errors show a dedicated screen with a message and a **Back home** link: `ROOM_NOT_FOUND` → "This room doesn't exist or has expired"; `ROOM_FULL` → "This race already has two players"; `RACE_IN_PROGRESS` → "A race is in progress in this room"; `ALREADY_IN_ROOM` → "You're already in this room in another tab". |
| FR-ROOM-4 | The lobby shows the room code, a **Copy invite link** button (confirmation announced via `aria-live`), and both seat cards. Each card shows display name, Guest/registered badge, ready state and connection state. An empty seat shows "Waiting for opponent…". |
| FR-ROOM-5 | Each player has a **Ready / Not ready** toggle. It is enabled only when both seats are filled. |
| FR-ROOM-6 | When both players are ready, the server starts the countdown (§8). Toggling not-ready or leaving during the countdown cancels it and returns to the lobby. |
| FR-ROOM-7 | **Leave room** emits `room:leave`, clears the seat token, and navigates home. The remaining player sees the seat become empty. |
| FR-ROOM-8 | Rooms expire after 10 minutes with no activity, or 60 s after both seats are empty. A player who reloads an expired room gets `ROOM_NOT_FOUND`. |

### 6.5 Live race

| ID | Requirement |
|---|---|
| FR-RACE-1 | Countdown: a 3-second visible countdown (3, 2, 1, Go!), timed to the server's `startsAt`. The passage is visible but the input is disabled. The countdown is announced to screen readers. |
| FR-RACE-2 | At start, the typing input is enabled and auto-focused. |
| FR-RACE-3 | The UI shows two progress tracks ("You" and opponent name) with percent complete and live WPM, a race timer, and a "time remaining" warning in the last 30 s. |
| FR-RACE-4 | The client sends `race:progress` at most every 150 ms while position or keystrokes change, and immediately when the passage is completed. |
| FR-RACE-5 | Opponent progress updates within 500 ms of their typing under normal network conditions. |
| FR-RACE-6 | When a player finishes, they see their own result immediately. If the opponent is still racing, they watch the opponent's live progress until the race ends. |
| FR-RACE-7 | The race ends when both participants are finished, DNF or forfeited, or when the 180 s time cap hits. |
| FR-RACE-8 | Paste and drag-and-drop into the typing input are blocked. |

### 6.6 Disconnects and reconnects

| ID | Requirement |
|---|---|
| FR-DC-1 | On disconnect, the server keeps the seat for **15 s** (`graceEndsAt`). The opponent sees "*Name* disconnected — waiting *N*s" with a countdown. |
| FR-DC-2 | If the player reconnects (Socket.IO auto-reconnect or a page reload with a valid seat token) within the grace period, they return to the current phase. During a race, the client resumes from the server's last accepted position. |
| FR-DC-3 | If the grace period expires **during a race**, the player is marked `FORFEIT` (result `LOSS`). The remaining player wins and may keep typing to record their WPM. |
| FR-DC-4 | If the grace period expires **in lobby, countdown or results**, the seat is freed and the countdown (if any) is cancelled. |
| FR-DC-5 | If **both** players are disconnected past grace during a race, the race is abandoned (not saved) and the room is closed. |
| FR-DC-6 | The client shows a global banner "Connection lost — reconnecting…" while its own socket is disconnected. Inputs are disabled. |

### 6.7 Results and rematch

| ID | Requirement |
|---|---|
| FR-RES-1 | The results screen shows, per player: place, result (Win/Loss/Draw), status (Finished/DNF/Forfeit), WPM (integer), accuracy (%, 1 decimal), time (s, 1 decimal). |
| FR-RES-2 | Shows a WPM-over-time line chart with one line per player (§15.5) and a "View as table" toggle. |
| FR-RES-3 | **Rematch:** each player can request a rematch. The UI shows "Opponent wants a rematch" when applicable. When both request, a new countdown starts with a **different** passage. |
| FR-RES-4 | If the opponent leaves during results, the rematch button is replaced with "Opponent left — share the invite link to race someone new". The room returns to the waiting state. |
| FR-RES-5 | If the race was saved (§12.3), a **View saved result** link to `/races/:id` is shown. |

### 6.8 Saved race page (`/races/:id`)

| ID | Requirement |
|---|---|
| FR-SAVED-1 | Anyone with the link can view it (race IDs are unguessable UUIDs). It shows the passage source, date, mode, participants' results and the WPM chart. |
| FR-SAVED-2 | An unknown or invalid ID shows a friendly "Race not found" page (HTTP 404 from the API, never a 500). |

### 6.9 Stats dashboard (`/stats`, registered users only)

| ID | Requirement |
|---|---|
| FR-STATS-1 | Summary cards: total races, duel record (W–L–D), best WPM, average WPM (last 10 races), average accuracy. |
| FR-STATS-2 | **WPM trend chart:** WPM per race over time with a rolling 5-race average line. |
| FR-STATS-3 | **Accuracy chart:** accuracy per race over time. |
| FR-STATS-4 | **Outcome breakdown:** wins, losses, draws for duels (bar or donut chart). |
| FR-STATS-5 | Filters: range (`7d` / `30d` / `all`, default `30d`) and mode (`all` / `solo` / `duel`, default `all`). Filters are reflected in the URL query string. |
| FR-STATS-6 | **Race history table:** date, mode, opponent (or "—"), WPM, accuracy, result. Paginated 20 per page, newest first. Each row links to `/races/:id`. |
| FR-STATS-7 | Every chart has a "View as table" alternative and a text summary (e.g. "Your WPM increased from 42 to 55 over 12 races"). |
| FR-STATS-8 | Empty state (no races in the range): an illustration-free message plus links to **Practice solo** and **Create a race**. |

### 6.10 Cross-cutting UI states

| ID | Requirement |
|---|---|
| FR-UI-1 | Every data-fetching view has **loading** (skeletons sized to the final layout), **empty**, and **error** states. The error state includes a **Retry** action. |
| FR-UI-2 | A React error boundary at the route level shows "Something went wrong" with **Reload** and **Home**. It never shows a white screen. |
| FR-UI-3 | Unknown routes render a 404 page with a link home. |
| FR-UI-4 | All navigation links point to existing routes. Zero broken links. |
| FR-UI-5 | The header is on every page: logo/home link, **Practice**, **Stats** (logged in only), and **Log in / Sign up** or **username + Log out**. |

---

## 7. Gameplay rules and scoring

All numeric constants live in `shared/src/constants.ts` (§7.5). Never hard-code them elsewhere.

### 7.1 Typing engine (client)

The engine is a **pure reducer** (`typingReducer(state, action)`) wrapped by a `useTypingEngine(passage)` hook. It is fully unit-tested with no DOM.

**Input model (word-at-a-time, "must fix" errors):**
- The passage renders as words. A labelled `<input type="text">` holds the **current word** being typed (TypeRacer-style).
- `committed` = index in the passage where the current word starts. The input value is compared against `passage.slice(committed, committed + input.length)`.
- **Correct prefix** = the longest prefix of the input that matches the passage. **Position** = `committed + correctPrefixLength`.
- If the input has a mismatch, the current word is in an **error state**. Mismatched characters are shown red **and** underlined, and the input gets `aria-invalid="true"`.
- The player **must backspace** to remove the error. Input beyond the first error is capped at `ERROR_BUFFER_MAX` (10) extra characters. Further keystrokes are ignored and not counted.
- **Space** commits the word only if the input exactly equals the current word (with no errors). Otherwise the space is treated as a typed character, so it becomes an error.
- On commit, `committed` advances past the word and its trailing space, and the input clears.
- The **last word** completes the passage as soon as the input exactly equals it. No trailing space is needed.
- Backspace and Ctrl/⌥+Backspace work normally inside the current word. You cannot backspace into committed words.
- Keystroke counting: each inserted character increments `totalKeystrokes`. If it is inserted at an index where the expected character differs, or while an earlier error exists in the input, it also increments `errorKeystrokes`.
- Input attributes: `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`. `onPaste` and `onDrop` are prevented.
- IME composition events are ignored until `compositionend`.

### 7.2 Formulas (`shared/src/scoring.ts`, used by client **and** server)

```ts
wpm(correctChars, elapsedMs)            = elapsedMs <= 0 ? 0 : (correctChars / 5) / (elapsedMs / 60_000)
accuracy(totalKeystrokes, errorKeystrokes) = totalKeystrokes === 0 ? 1 : (totalKeystrokes - errorKeystrokes) / totalKeystrokes
```

- Store WPM as a float. Display it rounded to an integer.
- Store accuracy as 0–1. Display it as a percentage with 1 decimal.
- **Final WPM in a duel** = `wpm(passage.charCount, finishedAt − startedAt)` using **server** timestamps.
- **DNF WPM** = `wpm(lastAcceptedPosition, RACE_TIME_CAP_MS)`.
- **Forfeit WPM** = `wpm(lastAcceptedPosition, forfeitedAt − startedAt)`.

### 7.3 Server authority and validation (duels)

The server is the source of truth for **position, finish time, WPM, placement and result**. The client's own live WPM display is cosmetic.

On every `race:progress` the server:
1. Parses the payload with Zod. Invalid → drop it and emit `server:error` `INVALID_PAYLOAD`.
2. Rejects it if the room is not `racing` or the sender is already finished.
3. Requires `0 ≤ position ≤ passage.charCount`. Position may **decrease**, because backspacing is allowed.
4. **Plausibility check:** `wpm(position, now − startedAt + 1000) ≤ MAX_PLAUSIBLE_WPM` (250). The 1000 ms tolerance absorbs latency. If it fails, the update is ignored and a warning is logged. Repeated failures (5+) mark the participant `flagged` in logs. Flagging does not affect gameplay in the MVP.
5. Requires `totalKeystrokes` and `errorKeystrokes` to be non-decreasing, with `errorKeystrokes ≤ totalKeystrokes`.
6. Stores the accepted progress and relays `race:progress` to the opponent with server-computed live WPM.
7. If `position === passage.charCount`, marks the player **FINISHED** with `finishedAt = now` (server clock).
8. Rate limit: more than 20 socket events per second per socket are dropped.

**WPM samples:** while racing, the server records each participant's latest accepted position **every 1000 ms** (`SAMPLE_INTERVAL_MS`) as `{ t: secondsSinceStart, wpm }`. It also records a final sample at finish, DNF or forfeit. These samples drive the race graph.

**Solo practice** runs entirely client-side, so the server can't timestamp it. `POST /practice-results` is validated for plausibility instead (§13). The server recomputes WPM and accuracy from the submitted raw values rather than trusting client-computed numbers.

### 7.4 Placement and results (duels)

1. **Finished** players rank first, ordered by `finishedAt` (earlier is better).
2. **DNF** players rank next, ordered by last position (higher is better).
3. **Forfeit** players rank last.
4. Result: place 1 → `WIN`, place 2 → `LOSS`.
   - **Draw** if both are DNF with equal position, or both finished with identical `finishedAt` ms.
   - **Forfeit always loses.** If both forfeit, the race is abandoned (FR-DC-5).

### 7.5 Constants (`shared/src/constants.ts`)

| Constant | Value | Env override (server, for tests) |
|---|---|---|
| `COUNTDOWN_MS` | 3000 | `RACE_COUNTDOWN_MS` |
| `RACE_TIME_CAP_MS` | 180000 | `RACE_TIME_CAP_MS` |
| `DISCONNECT_GRACE_MS` | 15000 | `DISCONNECT_GRACE_MS` |
| `ROOM_IDLE_TIMEOUT_MS` | 600000 | `ROOM_IDLE_TIMEOUT_MS` |
| `EMPTY_ROOM_TTL_MS` | 60000 | — |
| `PROGRESS_SEND_INTERVAL_MS` | 150 | — |
| `SAMPLE_INTERVAL_MS` | 1000 | — |
| `MAX_PLAUSIBLE_WPM` | 250 | — |
| `ERROR_BUFFER_MAX` | 10 | — |
| `ROOM_CODE_LENGTH` | 6 | — |
| `ROOM_CODE_ALPHABET` | `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L) | — |
| `NAME_REGEX` | `^[A-Za-z0-9_]{3,20}$` | — |
| `PASSAGE_MIN_CHARS` / `PASSAGE_MAX_CHARS` | 100 / 400 | — |
| `MAX_ROOMS` | 500 (new rooms rejected with `SERVER_BUSY` beyond this) | — |

### 7.6 Passages

- Stored in the `Passage` table and seeded from `server/prisma/seed-data/passages.json` by `npm run db:seed`. The seed is idempotent (upsert by text hash).
- **At least 60 passages**, spread across `EASY` / `MEDIUM` / `HARD`.
- **Content rules (validated by the seed script and a unit test):**
  - 100–400 characters.
  - **Printable ASCII only** (`0x20–0x7E`): straight quotes `'` `"`, hyphen `-`, no em dashes, curly quotes or ellipsis characters.
  - Single spaces only, no leading or trailing whitespace, no newlines or tabs.
- Sources must be **public domain** (e.g. pre-1929 books, US government text) or written by the team. Each passage has a `source` (e.g. `"Mary Shelley, Frankenstein (1818)"`).
- Difficulty is a guideline, set by the author: EASY is short, common words, little punctuation. HARD is long, with punctuation, numbers and capitals.
- Random selection excludes the room's previous passage (rematch) or the `exclude` query param (solo).

---

## 8. Race lifecycle state machine

### 8.1 Server room phases (authoritative)

```mermaid
stateDiagram-v2
    [*] --> waiting: room:create
    waiting --> lobby: 2nd player joins
    lobby --> waiting: a seat is freed
    lobby --> countdown: both ready
    countdown --> lobby: un-ready / leave / grace expired
    countdown --> racing: startsAt reached
    racing --> results: all participants finished/DNF/forfeit, or time cap
    racing --> closed: both forfeit (abandoned)
    results --> countdown: both request rematch
    results --> waiting: a seat is freed
    waiting --> closed: empty 60s / idle 10min
    lobby --> closed: idle 10min
    results --> closed: empty 60s / idle 10min
    closed --> [*]
```

| Phase | Meaning | Joinable? |
|---|---|---|
| `waiting` | 0–1 seat filled | Yes |
| `lobby` | 2 seats filled, ready flags shown | No (`ROOM_FULL`) |
| `countdown` | Passage chosen, `startsAt` set | No (`RACE_IN_PROGRESS`) |
| `racing` | Race running, `endsAt = startedAt + RACE_TIME_CAP_MS` | No (`RACE_IN_PROGRESS`); seat-token reclaim only |
| `results` | Results available, rematch flags shown | Only if a seat is free (the room moves to `waiting` first) |
| `closed` | Deleted from memory | `ROOM_NOT_FOUND` |

**Implementation requirement:** the phase transition logic is a **pure function** in `server/src/realtime/roomMachine.ts`, for example `transition(room, event, now) → { room, effects }`. It is unit-tested independently of Socket.IO. `RoomManager` handles timers, sockets and persistence by executing the returned effects.

Room state lives **in server memory only** (a `Map<code, Room>`). A server restart or deploy drops active rooms. This is acceptable and documented in an ADR. Only completed races are persisted.

### 8.2 Client race store (Zustand)

`client/src/features/race/raceStore.ts` holds a **discriminated union** keyed on `status`:

```ts
type RaceClientState =
  | { status: 'idle' }
  | { status: 'connecting'; code: string }
  | { status: 'joinError'; code: string; error: ErrorCode }
  | { status: 'inRoom'; code: string; seatId: SeatId; room: RoomSnapshot; connection: 'online' | 'reconnecting'; clockOffsetMs: number };
```

- The **phase** inside `inRoom` comes from the server's `RoomSnapshot` (§14). The client never advances the phase on its own.
- Components use typed selectors, e.g. `useRaceStore(selectPhase)`. Narrow with `Extract<RoomSnapshot, { phase: 'racing' }>`.
- `clockOffsetMs = snapshot.serverNow − Date.now()` is updated on every snapshot. Countdown and timers use `Date.now() + clockOffsetMs`.
- Typing engine state is **local** to the race view (via `useTypingEngine`), not in the global store, to avoid re-rendering the app on each keystroke.
- Server data (current user, passages, stats, history, saved races) is handled by **TanStack Query**, never Zustand.

---

## 9. System architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[React SPA<br/>Vite build]
    ZS[Zustand race store]
    TQ[TanStack Query cache]
    UI --- ZS
    UI --- TQ
  end

  subgraph Render["Render Web Service (single Node process)"]
    EX[Express 5<br/>REST /api/v1/*<br/>+ static client files]
    IO[Socket.IO server<br/>RoomManager in memory]
    SV[Services<br/>auth / passages / races / stats]
    EX --> SV
    IO --> SV
  end

  DB[(Neon Postgres<br/>via Prisma)]

  TQ -- HTTPS JSON + session cookie --> EX
  ZS -- WebSocket (Socket.IO) + session cookie --> IO
  SV --> DB
```

- **One deployable:** Express serves the built client (`client/dist`), the REST API under `/api/v1`, and Socket.IO at `/socket.io` on the same origin. There is no CORS in production.
- **Dev:** Vite dev server (port 5173) proxies `/api` and `/socket.io` (with `ws: true`) to Express (port 3000). It is still same-origin from the browser's view.
- **Auth on sockets:** the session cookie is sent on the Socket.IO handshake. An `io.use()` middleware resolves it to `socket.data.userId` / `username`, or null for guests.
- **SPA fallback:** any non-`/api`, non-asset GET returns `index.html`. Unknown `/api/*` routes return a JSON 404.
- **Persistence:** only on race completion (duels) or practice submission (solo). Room and race-in-progress data is never written to the DB.

---

## 10. Tech stack

Use the **current stable major version** of each library at scaffold time. The scaffolder pins exact versions in `package-lock.json` and records them in `docs/setup.md`. Follow that version's official docs. Some libraries (Prisma, Tailwind, React Router) changed setup significantly in recent majors.

| Concern | Choice | Notes |
|---|---|---|
| Language | **TypeScript** (strict), ESM everywhere | §16.2 |
| Runtime | **Node.js 22 LTS** | `.nvmrc` and `engines` field |
| Package manager | **npm** with **workspaces** | `client`, `server`, `shared`, `e2e` |
| Frontend | **React 19** + **Vite** | SPA |
| Routing | **React Router** (declarative/library mode) | Route-level code splitting with `React.lazy` |
| Styling | **Tailwind CSS** (v4, `@tailwindcss/vite`) | No other CSS frameworks or component libraries |
| Client state | **Zustand** | Race lifecycle only (§8.2) |
| Server state (client) | **TanStack Query** | All REST data |
| Charts | **Recharts** | Lazy-loaded only on results and stats routes |
| Validation | **Zod** | Shared schemas in `shared/` |
| Backend | **Express 5** | App factory `createApp()` for testability |
| Realtime | **Socket.IO 4** (server + client) | Typed with generics (§14) |
| Database | **PostgreSQL** on **Neon** (free tier) | Local dev: Docker Postgres or a personal Neon DB |
| ORM | **Prisma** | Migrations committed; seed script |
| Password hashing | **bcryptjs** (cost 12) | Pure JS, no native build step |
| Security middleware | **helmet**, **express-rate-limit**, **cookie-parser** | |
| Logging | **pino** (+ `pino-http`) | Never log passwords, tokens or cookies |
| Unit/integration tests | **Vitest**, **@testing-library/react**, **supertest**, **socket.io-client** | |
| E2E tests | **Playwright** + **@axe-core/playwright** | |
| Lint/format | **ESLint** (typescript-eslint `strictTypeChecked`, `jsx-a11y`, `react-hooks`), **Prettier** | |
| CI | **GitHub Actions** | |
| Hosting | **Render** web service (free tier) | `render.yaml` blueprint committed |

---

## 11. Repository layout

```
/
├── AGENTS.md                  # AI agent entry point → points here
├── CLAUDE.md                  # Imports AGENTS.md (for Claude Code)
├── requirements.md            # THIS FILE
├── README.md                  # What it is, live URL, quick start (<10 min), scripts, links to /docs
├── package.json               # workspaces + root scripts
├── tsconfig.base.json         # shared strict compiler options
├── eslint.config.js
├── .prettierrc
├── .nvmrc                     # 22
├── .env.example
├── docker-compose.yml         # local Postgres for dev/tests
├── render.yaml                # Render blueprint
├── .github/
│   ├── workflows/ci.yml
│   └── pull_request_template.md
├── shared/                    # imported by client AND server
│   └── src/
│       ├── constants.ts
│       ├── scoring.ts         # wpm(), accuracy()
│       ├── schemas/           # zod: auth, passage, race, stats, socket payloads
│       ├── types/             # DTOs, Result<T>, Paginated<T>, ErrorCode, RoomSnapshot
│       ├── socket-events.ts   # ClientToServerEvents, ServerToClientEvents, SocketData
│       └── index.ts
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   ├── seed.ts
│   │   └── seed-data/passages.json
│   └── src/
│       ├── index.ts           # bootstrap: env, http server, io, listen
│       ├── app.ts             # createApp(): express app (no listen) for supertest
│       ├── config/env.ts      # zod-validated process.env
│       ├── db/prisma.ts
│       ├── http/
│       │   ├── middleware/    # auth (session), validate<T>(), errorHandler, rateLimit
│       │   └── errors.ts      # AppError + HTTP mapping
│       ├── modules/
│       │   ├── auth/          # routes.ts, service.ts, session.ts
│       │   ├── passages/
│       │   ├── races/         # persistence of duel + practice results, GET /races/:id
│       │   └── stats/
│       └── realtime/
│           ├── io.ts          # Server<C2S, S2C, {}, SocketData> setup + auth middleware
│           ├── handlers.ts    # socket event → RoomManager
│           ├── RoomManager.ts # Map<code, Room>, timers, effects
│           ├── roomMachine.ts # PURE transition function
│           └── roomCode.ts
├── client/
│   ├── index.html
│   ├── public/                # favicon, robots.txt, manifest-free
│   └── src/
│       ├── main.tsx
│       ├── app/               # router, providers (QueryClient), layout, ErrorBoundary
│       ├── pages/             # one file per route, lazy-loaded
│       ├── features/
│       │   ├── auth/          # LoginForm, RegisterForm, useCurrentUser, RequireAuth
│       │   ├── typing/        # typingReducer, useTypingEngine, PassageDisplay, TypingInput
│       │   ├── race/          # raceStore, socket client, Lobby, Countdown, RaceView, Results
│       │   ├── practice/
│       │   └── stats/         # charts, summary cards, history table, filters
│       ├── components/ui/     # Button, TextField, Card, Badge, ProgressTrack, Spinner,
│       │                      # Skeleton, EmptyState, ErrorState, ChartWithTable, VisuallyHidden
│       ├── lib/               # apiClient<T>(), queryKeys, socket.ts, storage.ts
│       └── styles/index.css   # tailwind entry
├── e2e/
│   ├── playwright.config.ts
│   └── tests/
└── docs/                      # see §19
```

**Module rules**
- `features/*` may import from `components/ui`, `lib`, and `shared`. Features must not import from each other's internals. If two features need something, move it to `components/ui` or `lib`.
- `components/ui` contains presentational, reusable components only: no data fetching, no stores.
- Server `modules/*` each export a router and a service. Routes stay thin (parse → service → respond). Services hold the logic and are unit-tested.
- Tests are colocated as `*.test.ts(x)` next to the code. E2E tests live in `e2e/`.

---

## 12. Data model

### 12.1 ERD

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ RaceParticipant : "takes part (nullable for guests)"
    Passage ||--o{ Race : "used in"
    Race ||--|{ RaceParticipant : has

    User {
      uuid id PK
      varchar username
      varchar usernameNormalized UK
      varchar email UK
      text passwordHash
      timestamptz createdAt
    }
    Session {
      uuid id PK
      text tokenHash UK
      uuid userId FK
      timestamptz expiresAt
      timestamptz createdAt
    }
    Passage {
      uuid id PK
      text text
      char64 textHash UK
      varchar source
      enum difficulty
      int charCount
      timestamptz createdAt
    }
    Race {
      uuid id PK
      enum mode
      uuid passageId FK
      timestamptz startedAt
      timestamptz endedAt
    }
    RaceParticipant {
      uuid id PK
      uuid raceId FK
      uuid userId FK "nullable"
      varchar displayName
      bool isGuest
      int place "null for SOLO"
      enum result "null for SOLO"
      enum status
      float wpm
      float accuracy
      int durationMs
      int charsTyped
      int totalKeystrokes
      int errorKeystrokes
      jsonb wpmSamples
      timestamptz createdAt
    }
```

### 12.2 Prisma schema (baseline; adjust generator/datasource syntax to the installed Prisma version)

```prisma
enum Difficulty        { EASY MEDIUM HARD }
enum RaceMode          { SOLO DUEL }
enum ParticipantStatus { FINISHED DNF FORFEIT }
enum RaceResult        { WIN LOSS DRAW }

model User {
  id                 String            @id @default(uuid()) @db.Uuid
  username           String            @db.VarChar(20)
  usernameNormalized String            @unique @db.VarChar(20)   // lowercase
  email              String            @unique @db.VarChar(254)  // stored lowercase
  passwordHash       String
  createdAt          DateTime          @default(now()) @db.Timestamptz
  sessions           Session[]
  participations     RaceParticipant[]
}

model Session {
  id        String   @id @default(uuid()) @db.Uuid
  tokenHash String   @unique              // sha256(token) hex; raw token only in cookie
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz
  @@index([userId])
}

model Passage {
  id         String     @id @default(uuid()) @db.Uuid
  text       String
  textHash   String     @unique @db.Char(64)  // sha256(text), for idempotent seeding
  source     String     @db.VarChar(200)
  difficulty Difficulty
  charCount  Int
  createdAt  DateTime   @default(now()) @db.Timestamptz
  races      Race[]
}

model Race {
  id           String            @id @default(uuid()) @db.Uuid
  mode         RaceMode
  passageId    String            @db.Uuid
  passage      Passage           @relation(fields: [passageId], references: [id])
  startedAt    DateTime          @db.Timestamptz
  endedAt      DateTime          @db.Timestamptz
  participants RaceParticipant[]
  @@index([startedAt])
}

model RaceParticipant {
  id              String            @id @default(uuid()) @db.Uuid
  raceId          String            @db.Uuid
  race            Race              @relation(fields: [raceId], references: [id], onDelete: Cascade)
  userId          String?           @db.Uuid
  user            User?             @relation(fields: [userId], references: [id], onDelete: SetNull)
  displayName     String            @db.VarChar(20)
  isGuest         Boolean
  place           Int?              // 1 | 2 for DUEL; null for SOLO
  result          RaceResult?       // null for SOLO
  status          ParticipantStatus
  wpm             Float
  accuracy        Float             // 0..1
  durationMs      Int
  charsTyped      Int
  totalKeystrokes Int
  errorKeystrokes Int
  wpmSamples      Json              // WpmSample[] = { t: number; wpm: number }[]
  createdAt       DateTime          @default(now()) @db.Timestamptz
  @@index([userId, createdAt])
  @@index([raceId])
}
```

### 12.3 Persistence rules and constraints

| Rule | Where enforced |
|---|---|
| `usernameNormalized` = lowercase username; unique | Service + DB unique |
| `email` lowercased; unique | Service + DB unique |
| Password never stored or logged in plain text; `passwordHash` never returned by any API | Service; DTO mapping (`PublicUser = Pick<User, 'id' \| 'username' \| 'createdAt'>`) |
| Session token: 32 random bytes, base64url, stored only as SHA-256 hash; 30-day expiry; expired sessions rejected (and lazily deleted) | Auth middleware |
| Passage: 100–400 chars, printable ASCII, single-spaced, `charCount = text.length` | Seed script + unit test |
| `0 ≤ wpm ≤ 300`, `0 ≤ accuracy ≤ 1`, `durationMs > 0`, `errorKeystrokes ≤ totalKeystrokes` | Zod in service before write |
| `wpmSamples` length ≤ 600, each `t ≥ 0`, `wpm ≥ 0` | Zod |
| **Duels are persisted only if at least one participant is a registered user.** Guest-only duels show results on screen, but `raceId` is `null` and nothing is saved. | `RoomManager` on entering `results` |
| A duel is written in **one transaction** (Race + 2 RaceParticipants) | Race service |
| Abandoned races (both forfeit) are never saved | `RoomManager` |
| Solo practice results are saved only for logged-in users | `POST /practice-results` requires auth |

---

## 13. REST API contract

**Base path:** `/api/v1` · **Format:** JSON (`Content-Type: application/json` is required on bodies, otherwise 415) · **Auth:** httpOnly session cookie `kc_session`.

### 13.1 Conventions

**Success:** the resource itself (no envelope), with the correct status code.

**Error (every non-2xx):**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable message", "details": { "field": "username" } } }
```

**Error codes (`shared/src/types/errors.ts`, a string union used by REST and sockets):**
`VALIDATION_ERROR` (400) · `UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `CONFLICT` (409) · `UNSUPPORTED_MEDIA_TYPE` (415) · `RATE_LIMITED` (429) · `INTERNAL` (500, generic message only, never a stack trace) · socket-only: `ROOM_NOT_FOUND`, `ROOM_FULL`, `RACE_IN_PROGRESS`, `ALREADY_IN_ROOM`, `INVALID_SEAT_TOKEN`, `NOT_IN_ROOM`, `INVALID_PAYLOAD`, `SERVER_BUSY`.

**Shared generic types (required usage):**
```ts
export type ApiError = { error: { code: ErrorCode; message: string; details?: Record<string, string> } };
export type Paginated<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number };
export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; data: T }
  | { ok: false; error: { code: E; message: string } };
```

**Cookie:** `kc_session`; `HttpOnly`; `SameSite=Lax`; `Secure` in production; `Path=/`; `Max-Age` 30 days.

### 13.2 Endpoints

| Method & path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /health` | Public | — | `200 { "status": "ok" }` (also checks DB with `SELECT 1`; DB down → `503`) | 503 |
| `POST /auth/register` | Public | `{ username, email, password }` | `201 PublicUser` + sets cookie | 400, 409 (`details.field`), 429 |
| `POST /auth/login` | Public | `{ identifier, password }` (identifier = username or email) | `200 PublicUser` + sets cookie | 400, 401, 429 |
| `POST /auth/logout` | Session (no-op if none) | — | `204` + clears cookie, deletes session row | — |
| `GET /auth/me` | Session | — | `200 PublicUser` | 401 |
| `GET /passages/random?exclude=<uuid>&difficulty=<EASY\|MEDIUM\|HARD>` | Public | query optional | `200 PassageDTO` | 400, 404 (no passages) |
| `POST /practice-results` | **Required** | `PracticeResultInput` (below) | `201 { raceId }` | 400, 401, 404 (passage) |
| `GET /races/:id` | Public | `:id` uuid | `200 RaceDetailDTO` | 400 (bad uuid), 404 |
| `GET /me/races?page=1&pageSize=20&mode=all\|solo\|duel` | **Required** | query | `200 Paginated<RaceHistoryItemDTO>` | 400, 401 |
| `GET /me/stats?range=7d\|30d\|all&mode=all\|solo\|duel` | **Required** | query | `200 StatsDTO` | 400, 401 |

### 13.3 DTOs (defined as Zod schemas in `shared/src/schemas`, types inferred)

```ts
type PublicUser = { id: string; username: string; createdAt: string /* ISO */ };

type PassageDTO = { id: string; text: string; source: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; charCount: number };

type WpmSample = { t: number /* seconds since start */; wpm: number };

type PracticeResultInput = {
  passageId: string;
  durationMs: number;        // > 0
  totalKeystrokes: number;   // >= charCount
  errorKeystrokes: number;   // <= totalKeystrokes
  wpmSamples: WpmSample[];   // <= 600
};
// Server: loads passage; rejects (400) if wpm(charCount, durationMs) > MAX_PLAUSIBLE_WPM;
// computes wpm & accuracy itself; stores Race(mode=SOLO) + one RaceParticipant(status=FINISHED).

type ParticipantDTO = {
  displayName: string; isGuest: boolean;
  place: number | null; result: 'WIN' | 'LOSS' | 'DRAW' | null;
  status: 'FINISHED' | 'DNF' | 'FORFEIT';
  wpm: number; accuracy: number; durationMs: number; wpmSamples: WpmSample[];
};

type RaceDetailDTO = {
  id: string; mode: 'SOLO' | 'DUEL'; startedAt: string; endedAt: string;
  passage: Pick<PassageDTO, 'id' | 'text' | 'source' | 'difficulty'>;
  participants: ParticipantDTO[];
};

type RaceHistoryItemDTO = {
  raceId: string; mode: 'SOLO' | 'DUEL'; startedAt: string;
  opponentName: string | null; wpm: number; accuracy: number;
  result: 'WIN' | 'LOSS' | 'DRAW' | null; status: 'FINISHED' | 'DNF' | 'FORFEIT';
};

type StatsDTO = {
  range: '7d' | '30d' | 'all'; mode: 'all' | 'solo' | 'duel';
  summary: {
    totalRaces: number; wins: number; losses: number; draws: number;
    bestWpm: number | null; avgWpmLast10: number | null; avgAccuracy: number | null;
  };
  trend: { raceId: string; startedAt: string; wpm: number; accuracy: number; mode: 'SOLO' | 'DUEL'; rollingAvgWpm: number }[]; // oldest → newest, max 200 points
};
```

### 13.4 Example

```http
POST /api/v1/auth/register
Content-Type: application/json

{ "username": "speedy_kim", "email": "kim@example.com", "password": "correct horse" }
```
```http
HTTP/1.1 201 Created
Set-Cookie: kc_session=...; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=2592000

{ "id": "6f1c…", "username": "speedy_kim", "createdAt": "2026-11-28T18:22:10.000Z" }
```

---

## 14. Socket.IO event contract

Defined in `shared/src/socket-events.ts`. Server: `new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>`. Client: `io() as Socket<ServerToClientEvents, ClientToServerEvents>`, created via a typed factory. Every inbound payload is Zod-parsed on the server.

### 14.1 Types

```ts
export type SeatId = 'A' | 'B';

export type SeatView = {
  seatId: SeatId;
  displayName: string;
  isGuest: boolean;
  ready: boolean;
  connection: 'connected' | 'disconnected';
  graceEndsAt: number | null;           // epoch ms (server clock) when disconnected
};

export type ProgressView = { position: number; wpm: number; finished: boolean };

export type ParticipantResult = {
  seatId: SeatId; displayName: string; isGuest: boolean;
  place: 1 | 2; result: 'WIN' | 'LOSS' | 'DRAW';
  status: 'FINISHED' | 'DNF' | 'FORFEIT';
  wpm: number; accuracy: number; durationMs: number; wpmSamples: WpmSample[];
};

export type RaceResults = { raceId: string | null; participants: ParticipantResult[] };

type RoomBase = { code: string; seats: SeatView[]; serverNow: number };

export type RoomSnapshot =
  | (RoomBase & { phase: 'waiting' })
  | (RoomBase & { phase: 'lobby' })
  | (RoomBase & { phase: 'countdown'; passage: PassageDTO; startsAt: number })
  | (RoomBase & { phase: 'racing'; passage: PassageDTO; startedAt: number; endsAt: number;
                  progress: Partial<Record<SeatId, ProgressView>> })
  | (RoomBase & { phase: 'results'; passage: PassageDTO; results: RaceResults; rematchRequestedBy: SeatId[] });

export type JoinedRoom = { seatId: SeatId; seatToken: string; room: RoomSnapshot };

export type ProgressPayload = { position: number; totalKeystrokes: number; errorKeystrokes: number };

export interface ClientToServerEvents {
  'room:create': (p: { nickname?: string }, ack: (r: Result<JoinedRoom>) => void) => void;
  'room:join':   (p: { code: string; nickname?: string; seatToken?: string }, ack: (r: Result<JoinedRoom>) => void) => void;
  'room:leave':  () => void;
  'player:ready': (p: { ready: boolean }) => void;
  'race:progress': (p: ProgressPayload) => void;
  'race:rematch': () => void;
}

export interface ServerToClientEvents {
  'room:state':    (s: RoomSnapshot) => void;                          // full snapshot on every phase/seat/ready/connection change
  'race:progress': (p: { seatId: SeatId } & ProgressView) => void;     // hot path, during racing only
  'server:error':  (e: { code: ErrorCode; message: string }) => void;
}

export type SocketData = { userId: string | null; username: string | null; roomCode: string | null; seatId: SeatId | null };
```

### 14.2 Behaviour rules

| Event | Rules |
|---|---|
| `room:create` | Guests must send a valid `nickname`. Logged-in users' nickname is ignored and their username is used. Generates a unique code and gives the creator seat `A`. Ack contains the `seatToken`, which the client stores in `sessionStorage` under `kc_seat_<CODE>`. |
| `room:join` | Code is uppercased. With a valid `seatToken`, the player reclaims that seat in any phase (reconnect). Without one, they take a free seat only in `waiting`, otherwise `ROOM_FULL` / `RACE_IN_PROGRESS`. A logged-in user already seated in that room gets `ALREADY_IN_ROOM` unless reclaiming with a token. |
| `room:leave` | Frees the seat immediately. No grace period. If racing, the player is a forfeit. |
| `player:ready` | Allowed only in `lobby`. Both ready → `countdown`. Un-ready in `countdown` → back to `lobby`. |
| `race:progress` (C→S) | See §7.3. |
| `race:rematch` | Allowed only in `results` with both seats filled. Both requested → `countdown` with a new passage. |
| `room:state` | Sent to everyone in the Socket.IO room `room:<CODE>` on every state change except per-keystroke progress. It is the client's single source of truth for phase. |
| `race:progress` (S→C) | Broadcast to the room after each accepted progress update. The client ignores its own seat's echo for display. |
| disconnect | Seat → `disconnected`, `graceEndsAt = now + DISCONNECT_GRACE_MS`, `room:state` broadcast. Behaviour on expiry: §6.6. |

**Seat tokens:** 24 random bytes, base64url. Tokens are compared in constant time and only exist in memory.

---

## 15. Frontend specification

### 15.1 Routes

| Path | Page | Auth | Lazy | Notes |
|---|---|---|---|---|
| `/` | HomePage | — | No (in main bundle) | FR-HOME-* |
| `/practice` | PracticePage | — | Yes | FR-SOLO-* |
| `/r/:code` | RoomPage | — | Yes | Renders Lobby / Countdown / Race / Results from `room.phase` |
| `/races/:id` | SavedRacePage | — | Yes | FR-SAVED-* |
| `/stats` | StatsPage | Required | Yes | FR-STATS-* |
| `/login` | LoginPage | Guest-only (logged in → `/`) | Yes | |
| `/register` | RegisterPage | Guest-only | Yes | |
| `*` | NotFoundPage | — | Yes | |

Each page sets `document.title` (e.g. "Stats · KeyClashr").

### 15.2 Data fetching

- One typed fetch wrapper: `apiClient<TResponse>(path, { method, body, schema })`. It parses the response with the given Zod schema, throws a typed `ApiClientError` with an `ErrorCode` on non-2xx, and sends `credentials: 'same-origin'`.
- Query keys are centralised in `lib/queryKeys.ts` (e.g. `queryKeys.stats({ range, mode })`).
- Mutations (login, register, logout, practice submit) invalidate the relevant keys (`me`, `stats`, `myRaces`).

### 15.3 Socket client

- A single Socket.IO client instance is created lazily (`autoConnect: false`). It connects when entering `/r/:code` and disconnects when leaving the room page.
- Socket event handlers only dispatch into the Zustand store. Components never subscribe to the socket directly.

### 15.4 Reusable UI components (`components/ui`)

At minimum: `Button` (variants via a typed `variant` union), `TextField` (label, hint, error, `aria-describedby` wiring), `Card`, `Badge`, `ProgressTrack` (role=progressbar with `aria-valuenow`/`aria-valuetext`), `Spinner`, `Skeleton`, `EmptyState`, `ErrorState` (with retry callback), `VisuallyHidden`, `LiveRegion`, and `ChartWithTable<T>` (a generic wrapper that renders a chart, a text summary and a toggleable `<table>` from the same `T[]` data).

### 15.5 Charts (Recharts)

| Chart | Data | Type |
|---|---|---|
| Race WPM over time | `wpmSamples` per participant | Line chart, one line per player, x = seconds, y = WPM |
| WPM trend | `StatsDTO.trend` | Line (per race) + line (rolling 5-race avg), x = date |
| Accuracy trend | `StatsDTO.trend` | Line or bar, y = % |
| Duel outcomes | `summary.wins/losses/draws` | Bar or donut |

Requirements:
- Recharts is imported **only** from lazy-loaded chunks.
- Lines are distinguished by **colour and dash pattern/marker shape**.
- Colours meet 3:1 contrast against the background.
- Every chart is wrapped in `ChartWithTable` (FR-STATS-7) inside a `<figure>` with `<figcaption>`.
- Fixed chart heights prevent CLS.

### 15.6 Visual design

Keep it clean and simple: one light colour scheme, Tailwind defaults, and a monospace font for the passage (system mono stack, no web-font download). No theme switching (out of scope). Layout is responsive down to 360 px width.

---

## 16. Non-functional requirements

### 16.1 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-1 | Lighthouse (mobile, production build) **≥ 90** for Performance, Accessibility, Best Practices and SEO on `/`, `/practice`, `/login` and `/stats` (logged in). |
| NFR-PERF-2 | CLS < 0.1. Skeletons and charts reserve their final size. |
| NFR-PERF-3 | Initial JS for `/` ≤ 200 KB gzipped. Routes and Recharts are code-split. |
| NFR-PERF-4 | Typing input latency: a keystroke renders within one frame. Passage characters are memoised per word so only the current word re-renders. |
| NFR-PERF-5 | Static assets are served with hashed filenames and `Cache-Control: public, max-age=31536000, immutable`. `index.html` uses `no-cache`. Responses are gzip/brotli-compressed. |
| NFR-PERF-6 | Render's free tier sleeps after inactivity. The app must show a clear loading state (not an error) during a cold start. Before demos, wake it by visiting `/api/v1/health`. |

### 16.2 Type safety and code quality

- `tsconfig.base.json` must include: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true`, `"noImplicitReturns": true`, `"verbatimModuleSyntax": true`, `"forceConsistentCasingInFileNames": true`.
- ESLint (errors, not warnings): `@typescript-eslint/no-explicit-any`, `no-unsafe-*`, `no-non-null-assertion`, `ban-ts-comment`, `switch-exhaustiveness-check`, `jsx-a11y/recommended`, `react-hooks/rules-of-hooks` and `exhaustive-deps`.
- `as` casts are not allowed except `as const` and the typed Socket.IO client factory. Any other cast needs an inline justification comment and reviewer sign-off.
- **Required, visible use of generics and utility types** (the rubric checks for this). At minimum:
  - `Result<T, E>`, `Paginated<T>`, `apiClient<T>()`, `ChartWithTable<T>`
  - the typed `validate<TSchema>()` Express middleware
  - Socket.IO's `Server<C2S, S2C, …, SocketData>` generics
  - `Pick`/`Omit` for DTOs, `Extract<RoomSnapshot, { phase: … }>` for phase narrowing, `Partial<Record<SeatId, …>>`, `Readonly` for constants, `z.infer` for schema-derived types
- Discriminated-union `switch` statements end with an exhaustive `never` check.
- Functions are small and single-purpose. Components over ~150 lines should be split.

### 16.3 Accessibility (WCAG 2.1 AA)

| ID | Requirement |
|---|---|
| NFR-A11Y-1 | Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, logical heading order, and a "Skip to main content" link. |
| NFR-A11Y-2 | All functionality works with keyboard only. Focus is visible (≥ 3:1 contrast outline). There are no keyboard traps. |
| NFR-A11Y-3 | Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components). |
| NFR-A11Y-4 | Typing errors are indicated by **colour plus underline** and `aria-invalid`. Correct, current and untyped characters are distinguishable without colour (e.g. the current character has an underline or caret). |
| NFR-A11Y-5 | The passage is exposed to assistive tech once as plain text (visually hidden copy). Per-character styled spans are `aria-hidden`. The typing input has a visible label. |
| NFR-A11Y-6 | Live regions: countdown numbers (`assertive`), race start and finish (`assertive`), opponent milestones at 25/50/75/100% (`polite`, **not** every update), connection lost/restored (`polite`), "Link copied" (`polite`). |
| NFR-A11Y-7 | Progress tracks use `role="progressbar"` with `aria-valuenow` and `aria-valuetext` (e.g. "Opponent: 45 percent, 62 words per minute"). |
| NFR-A11Y-8 | `prefers-reduced-motion`: disable animated countdown scaling, shake-on-error and progress bar transitions. |
| NFR-A11Y-9 | Form fields have labels. Errors are linked via `aria-describedby` and announced. On submit failure, focus moves to the first invalid field. |
| NFR-A11Y-10 | Charts have table alternatives and text summaries (FR-STATS-7). |
| NFR-A11Y-11 | `<html lang="en">`, a meaningful `<title>` per route, and focus moves to the page `h1` on route change. |
| NFR-A11Y-12 | Automated axe scans run in Playwright with **zero violations** on every route (§17.3). |

### 16.4 Security

| ID | Requirement |
|---|---|
| NFR-SEC-1 | Passwords hashed with bcryptjs (cost 12). Constant-time comparisons. Generic login failure message. |
| NFR-SEC-2 | Session cookie settings as in §13.1. The raw token is never stored server-side. Only its hash is stored. |
| NFR-SEC-3 | Rate limits: `/auth/register` and `/auth/login`: 10 requests/min/IP. All `/api`: 300 requests/min/IP. Sockets: 20 events/s/socket and 10 `room:create`/min/IP. |
| NFR-SEC-4 | `helmet` with a CSP: `default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; style-src 'self'` (relax only if a library strictly needs it, and document why). |
| NFR-SEC-5 | CSRF: same-origin SPA, `SameSite=Lax` cookie, and JSON-only bodies (415 otherwise). Documented in an ADR. |
| NFR-SEC-6 | All input validated with Zod. Prisma only, so queries are parameterised. Never use `dangerouslySetInnerHTML`. |
| NFR-SEC-7 | `trust proxy` set to 1 in production (behind Render's proxy) so rate limiting and `Secure` cookies work. |
| NFR-SEC-8 | No secrets in the repo. The server fails fast on startup if required env vars are missing or invalid (Zod-validated env). |

### 16.5 Reliability

| ID | Requirement |
|---|---|
| NFR-REL-1 | A central Express error handler maps `AppError` to its status and anything else to `500 INTERNAL` with a generic message, logging the details server-side. |
| NFR-REL-2 | Socket handlers are wrapped so a thrown error emits `server:error` `INTERNAL` and never crashes the process. |
| NFR-REL-3 | DB failures during duel persistence don't block the results screen. The results show with `raceId: null`, and the error is logged. |
| NFR-REL-4 | Graceful shutdown on `SIGTERM`: stop accepting connections, close Socket.IO, disconnect Prisma. |

---

## 17. Testing strategy

**Tools:** Vitest (unit and integration), Testing Library (components), Supertest (HTTP), `socket.io-client` (realtime integration), Playwright + axe (E2E). All must pass in CI before merge.

**Coverage target:** ≥ 80% lines for `shared/` and `server/src`, ≥ 70% for `client/src/features`. Reported in CI (not a hard gate unless the team decides otherwise).

### 17.1 Unit tests (must exist)

- `shared/scoring.ts`: WPM and accuracy, including edge cases (0 elapsed, 0 keystrokes).
- All Zod schemas: valid and invalid samples.
- `typingReducer`: correct typing, error and must-fix, error buffer cap, space-commit rules, last word, backspace limits, keystroke counting, paste ignored.
- `roomMachine.transition`: every transition in §8.1, including countdown cancel, grace expiry in each phase, forfeit, time cap, draw rules, rematch.
- Progress validation (§7.3): monotonic keystrokes, plausibility cap, bounds.
- Placement and result calculation (§7.4).
- Stats aggregation (rolling average, W/L/D, ranges).
- Passage seed content rules (§7.6) across the whole seed file.
- Key components: `TypingInput`/`PassageDisplay` rendering of states, `ProgressTrack` ARIA, `ChartWithTable` table toggle, auth forms' validation display.

### 17.2 Integration tests (server, real Postgres)

- Auth: register → me → logout → me (401); duplicate username (case-insensitive) → 409; login with email and with username; rate limit → 429.
- Practice results: auth required; implausible WPM → 400; success → appears in `/me/races` and `/me/stats`.
- `/races/:id`: 400 bad uuid, 404 unknown, 200 shape.
- Realtime (two `socket.io-client` clients against an in-process server, with short timing env overrides): create/join/full/not-found, ready → countdown → racing → progress relay → finish → results, persistence when one player is registered, disconnect → grace → forfeit, reconnect with seat token, rematch.

### 17.3 End-to-end tests (Playwright)

Run against the **production build** served by Express, with a seeded test DB and short timing overrides (`RACE_COUNTDOWN_MS=500`, `DISCONNECT_GRACE_MS=2000`, `RACE_TIME_CAP_MS=20000`).

**Critical flows (must pass in CI):**
1. **Guest solo practice:** open `/practice`, type the passage (read it from the DOM, type with `page.keyboard.type`), and see the results and chart.
2. **1v1 duel, two browser contexts:** A creates a room and copies the link. B opens it. Both ready up. Both type, with A faster. Both see A win, and the WPM chart renders.
3. **Account flow:** register → solo practice → result saved → `/stats` shows 1 race and the chart → history row links to `/races/:id` → log out → `/stats` redirects to login.
4. **Room errors:** an invalid code shows "doesn't exist". A third browser joining a full room shows "already has two players".
5. **Disconnect forfeit:** B closes its page mid-race. A sees the disconnected banner. After grace, B is shown as Forfeit and A wins.
6. **Accessibility:** axe scan with zero violations on `/`, `/practice`, `/login`, `/register`, `/stats`, lobby, race view, results, and 404.
7. **Typing must-fix:** typing a wrong character shows the error state and doesn't advance progress. Backspace and correction then advance it.

---

## 18. CI/CD, deployment and environments

### 18.0 Ownership

One team member is the **CI/CD owner**. They own everything in Track D (§22.1):
- GitHub Actions workflows
- branch protection
- the E2E test harness (Playwright config, test DB, timing overrides in CI)
- Render and Neon configuration, `render.yaml`, deploy method and secrets
- `docs/deployment.md`
- ADRs 0011 and 0012

Rules:
- Other members may open PRs touching these files, but should agree the change with the CI/CD owner first.
- The CI/CD owner decides how CI failures caused by infrastructure (not app code) get fixed. Failures caused by app code are fixed by whoever broke them.
- **Bus factor:** the CI/CD owner documents everything in `docs/deployment.md` well enough that another member can run a deploy, roll back, and rotate a secret without help. At least one other member does a walkthrough before M3. Peer reviews ask about bus factor.
- Everyone else still writes the **tests** for their own features (§17). The CI/CD owner makes them run reliably in CI.

### 18.1 GitHub Actions (`.github/workflows/ci.yml`)

Triggers: every pull request, and every push to `main`.

| Job | Steps | Needs |
|---|---|---|
| `lint-typecheck` | `npm ci` → `npm run lint` → `npm run typecheck` → `npm run format:check` | — |
| `test` | Postgres 16 service container → `prisma migrate deploy` → seed → `npm run test -- --coverage` | — |
| `build` | `npm run build` (shared → server → client) | `lint-typecheck` |
| `e2e` | Postgres service → migrate → seed → build → start server → `npx playwright install --with-deps chromium` → `npm run test:e2e`; upload Playwright HTML report as an artifact on failure | `build` |

**Branch protection on `main`:** all four jobs must pass to merge. Approvals are not required (team decision), but PRs are mandatory: no direct pushes to `main`.

### 18.2 Deployment (Render)

- **Service:** one Render **Web Service** (Node, free tier) defined in `render.yaml`.
- **Build command:** `npm ci && npm run build`
- **Start command:** `npm run start:prod`. This runs `prisma migrate deploy` then `node server/dist/index.js`, because free-tier Render has no pre-deploy hook.
- **Health check path:** `/api/v1/health`
- **Auto-deploy:** set to deploy **only after CI checks pass** on `main`. If that setting isn't available, use a Render deploy hook called from a final CI job on `main` (secret `RENDER_DEPLOY_HOOK_URL`). Document the chosen method in `docs/deployment.md`.
- **Database:** Neon Postgres. Use the **pooled** connection string for the app (`DATABASE_URL`) and the **direct** one for migrations (`DIRECT_URL`).
- **Seeding production:** run `npm run db:seed` once (manually or via a one-off job), documented in `docs/deployment.md`. The seed is idempotent.

### 18.3 Environment variables (`.env.example`)

| Name | Required | Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | yes | `development` | `development` / `test` / `production` |
| `PORT` | no | `3000` | Render sets this automatically |
| `DATABASE_URL` | yes | `postgresql://postgres:postgres@localhost:5432/keyclashr` | App DB connection (pooled on Neon) |
| `DIRECT_URL` | yes | same as above locally | Migrations (direct, non-pooled on Neon) |
| `LOG_LEVEL` | no | `info` | pino level |
| `RACE_COUNTDOWN_MS` | no | `3000` | Test override |
| `RACE_TIME_CAP_MS` | no | `180000` | Test override |
| `DISCONNECT_GRACE_MS` | no | `15000` | Test override |
| `ROOM_IDLE_TIMEOUT_MS` | no | `600000` | Test override |

There are no auth secrets: session tokens are random and stored as hashes, so no signing key is needed.

### 18.4 Local development

1. `nvm use` (Node 22) → `npm install`
2. `cp .env.example .env`
3. Database: `docker compose up -d db` (**recommended**), **or** create a free personal Neon database and paste its URLs into `.env`.
4. `npm run db:migrate` → `npm run db:seed`
5. `npm run dev`: runs Vite (5173) and the server (3000, `tsx watch`) together. Open http://localhost:5173
6. Test two players locally with one normal window plus one private/incognito window, or two tabs. Seat tokens are per tab.

### 18.5 Root npm scripts (required names)

`dev`, `build`, `start:prod`, `lint`, `typecheck`, `format`, `format:check`, `test`, `test:e2e`, `db:migrate` (dev), `db:deploy` (prod migrate), `db:seed`, `db:reset`.

---

## 19. Documentation deliverables

Graded at 15%. Another team must get the app running from our docs in **< 20 minutes** (Week 12). The README fresh install must take **< 10 minutes**.

| File | Contents |
|---|---|
| `README.md` | What KeyClashr is, live demo URL, CI badge, screenshot/GIF, feature list, quick start (§18.4), scripts table, links to `/docs`. |
| `docs/system.md` | Architecture diagram (§9), request and realtime flows (sequence diagrams for "join room" and "race progress"), infrastructure (Render + Neon), room state machine (§8.1). |
| `docs/api.md` | Every REST endpoint (§13) and every socket event (§14), with auth requirements and request/response examples. |
| `docs/data-model.md` | ERD (§12.1), table descriptions, validation and constraints (§12.3). |
| `docs/setup.md` | Step-by-step local setup for Windows, macOS and Linux, env vars table, troubleshooting (ports in use, Docker not running, Prisma client not generated). |
| `docs/deployment.md` | **(CI/CD owner)** Render + Neon setup, env vars, deploy method, rollback, secret rotation, seeding prod, CI/CD pipeline description and links to workflow runs. |
| `docs/adrs/NNNN-title.md` | One ADR per decision below, using the template in `docs/adrs/0000-template.md`: **Context / Options considered / Decision / Consequences**. |

**Required ADRs (each records a decision already made in this doc):**

| # | Decision |
|---|---|
| 0001 | Monorepo with npm workspaces and a `shared` package |
| 0002 | Vite React SPA + Express on one service (vs Next.js, vs split services) |
| 0003 | Socket.IO for realtime (vs raw `ws`; why not webhooks/polling) |
| 0004 | PostgreSQL on Neon + Prisma (vs MongoDB Atlas, Supabase, Render Postgres's 30-day expiry) |
| 0005 | In-house session auth with DB sessions and httpOnly cookies (vs JWT, OAuth, hosted auth) |
| 0006 | Server-authoritative race scoring and plausibility checks (vs trusting the client) |
| 0007 | In-memory room state on a single instance (vs Redis; trade-off: deploys drop live rooms) |
| 0008 | Zustand + TanStack Query for state (vs Redux Toolkit, XState) |
| 0009 | Tailwind CSS (vs CSS Modules, component libraries) |
| 0010 | Recharts with table fallbacks for data viz (vs Chart.js canvas, D3/Visx) |
| 0011 | Render hosting with CI-gated deploys |
| 0012 | Testing strategy: Vitest + Playwright with timing overrides |
| 0013 | "Must-fix" word-at-a-time typing model |

---

## 20. Change control

- This document is versioned in Git. To change a requirement, open a PR titled `spec: <summary>` that edits this file, adds a line to [§23](#23-changelog), and adds or updates an ADR if a technical decision changes.
- Spec changes need agreement from the team (a comment or reaction from each member on the PR) before merging, even though code PRs don't require approval.
- Agents must not edit this file as a side effect of a feature task. Spec edits are their own PR.

---

## 21. Git workflow and conventions

- **Branches:** `main` is protected and always deployable. Work happens on `feat/<task-id>-short-desc`, `fix/<short-desc>`, `docs/<short-desc>`, `chore/<short-desc>`. Example: `feat/T-RACE-3-progress-relay`.
- **PRs:** required for every change into `main`, and CI must be green. Self-merge is allowed. Use the PR template:
  - Task ID(s) and requirement IDs (e.g. FR-RACE-4)
  - What changed and why
  - How it was tested
  - Screenshots for UI changes
  - Checklist: types strict, tests added, a11y checked, loading/empty/error states, docs updated
- **Commits:** Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `ci:`). Small and frequent. Peer reviews look at commit history.
- **Merging:** squash-merge PRs. Delete branches after merge. Rebase or merge `main` into your branch frequently to avoid big conflicts.
- **Shared contract changes** (anything in `shared/`, the Prisma schema, or API/event shapes) should be announced to the team in chat before merging, since they affect everyone's work.

### 21.1 Definition of Done (every task)

- [ ] Meets the referenced FR/NFR IDs
- [ ] No `any`, lint and typecheck clean
- [ ] Unit tests (and integration/E2E where relevant) added and passing
- [ ] Loading, empty and error states handled (for UI)
- [ ] Keyboard and screen-reader basics checked, axe clean (for UI)
- [ ] Docs updated (`docs/*`, README, `.env.example`) if behaviour, API, env or schema changed
- [ ] CI green, PR merged to `main`, deployed build verified for user-facing changes

---

## 22. Milestones and task backlog

**Target: feature-complete by Thu Dec 10, submit by Sun Dec 13.** The hard deadline is Tue Dec 15. Note US Thanksgiving is Thu Nov 26. Confirm the exact Week 12 documentation-swap date. `docs/setup.md` must work by then.

| Milestone | Dates | Exit criteria |
|---|---|---|
| **M0 Foundation** | Sat Nov 21 → Wed Nov 25 | Monorepo scaffolded. CI green with lint/typecheck/test/build/e2e placeholder. Prisma schema migrated and seeded. "Hello" app deployed on Render with `/api/v1/health` returning ok against Neon. Shared contracts (§13/§14 types) merged. |
| **M1 Core loop** | Thu Nov 26 → Tue Dec 1 | Solo practice works end-to-end. Register/login/logout works. Two browsers can create/join a room and finish a live race with results on screen. |
| **M2 Feature complete** | Wed Dec 2 → Sun Dec 6 | Persistence, saved race page, stats dashboard with charts, disconnect/grace/forfeit, rematch. All docs drafted (setup verified by a teammate on a clean machine). |
| **M3 Hardening** | Mon Dec 7 → Thu Dec 10 | All E2E flows in §17.3 pass in CI. Lighthouse ≥ 90 on all audited pages. axe clean. Edge cases from §6 verified. Bug bash. **Feature freeze.** |
| **M4 Ship** | Fri Dec 11 → Sun Dec 13 (buffer to Tue Dec 15) | Final docs and ADRs, README polish, video demo (< 10 min) recorded, submission done. |

### 22.1 Task backlog (unassigned)

Tasks are grouped into feature tracks (A, B, C) and a **CI/CD track (D), owned by the CI/CD owner** (§18.0). Tracks A–C can be divided among the other members as they see fit.

Tasks are tracked on the team's **Trello board**:
- Card title = `<Task ID> <task name>` (e.g. `T-A-3 roomMachine pure transition function`).
- Members claim a card by adding themselves to it.
- The task ID also goes in the branch name and PR title, so Trello cards and GitHub PRs can be cross-referenced.

`Deps` = tasks that must merge first.

#### Track 0: Foundation (M0, feature members swarm; do these first, in order. The CI/CD owner works Track D in parallel)

| ID | Task | Deps | Refs |
|---|---|---|---|
| T-F-1 | Scaffold monorepo: npm workspaces, `tsconfig.base.json`, ESLint/Prettier, `.nvmrc`, root scripts, `.gitignore`, `.env.example`, `AGENTS.md`/`CLAUDE.md` | — | §10, §11, §16.2, §18.5 |
| T-F-2 | `shared` package: constants, scoring, error codes, `Result`/`Paginated`, Zod schemas and DTOs, socket event types | T-F-1 | §7.2, §7.5, §13, §14 |
| T-F-3 | Server skeleton: `createApp()`, Zod env config, pino, helmet, error handler, JSON 404, `/api/v1/health`, static client serving + SPA fallback, graceful shutdown | T-F-1 | §9, §16.4, §16.5 |
| T-F-4 | Prisma schema + first migration, `docker-compose.yml`, seed script + content validator, ≥ 60 passages | T-F-1 | §7.6, §12 |
| T-F-5 | Client skeleton: Vite + React + Tailwind + Router with lazy routes, layout/header/skip link, QueryClient, `apiClient<T>`, ErrorBoundary, NotFound, `components/ui` basics | T-F-1 | §15 |

#### Track A: Typing engine and live race (realtime)

| ID | Task | Deps | Refs |
|---|---|---|---|
| T-A-1 | `typingReducer` + `useTypingEngine` + full unit tests | T-F-2 | §7.1 |
| T-A-2 | `PassageDisplay` + `TypingInput` components (a11y per NFR-A11Y-4/5) | T-A-1, T-F-5 | §7.1, §16.3 |
| T-A-3 | `roomMachine.transition` pure function + exhaustive unit tests | T-F-2 | §8.1, §7.4 |
| T-A-4 | Socket.IO server: typed `io`, session auth middleware, `RoomManager` (timers, codes, seat tokens), handlers for create/join/leave/ready | T-A-3, T-F-3 | §14 |
| T-A-5 | Progress validation, relay, WPM sampling, finish/time cap/results, placement | T-A-4 | §7.3, §7.4 |
| T-A-6 | Disconnect grace, reconnect via seat token, forfeit, abandon, rematch | T-A-5 | §6.6, §6.7 |
| T-A-7 | Client socket factory + Zustand `raceStore` + RoomPage phase rendering (Lobby, Countdown, RaceView, Results) | T-A-2, T-A-4 | §8.2, §15.3, FR-ROOM-*, FR-RACE-* |
| T-A-8 | Realtime integration tests (two socket clients) | T-A-6 | §17.2 |
| T-A-9 | E2E flows 2, 4, 5, 7 | T-A-7, T-D-3 | §17.3 |

#### Track B: Accounts, practice and persistence

| ID | Task | Deps | Refs |
|---|---|---|---|
| T-B-1 | Auth module: register/login/logout/me, sessions, bcrypt, rate limits, auth middleware + integration tests | T-F-3, T-F-4 | §5, §13, §16.4 |
| T-B-2 | Client auth: `useCurrentUser`, Login/Register pages with shared Zod validation, header state, `RequireAuth`, `next` redirect | T-B-1, T-F-5 | FR-AUTH-* |
| T-B-3 | `GET /passages/random` + tests | T-F-4 | §13 |
| T-B-4 | PracticePage (uses T-A-1/T-A-2 engine), results view, guest CTA | T-B-3, T-A-2 | FR-SOLO-* |
| T-B-5 | `POST /practice-results` + plausibility validation + tests; client submit with retry | T-B-1, T-B-4 | FR-SOLO-5, §7.3 |
| T-B-6 | Duel persistence service (transactional) called by `RoomManager` on results; `raceId` in results | T-A-5, T-B-1 | §12.3 |
| T-B-7 | `GET /races/:id` + SavedRacePage | T-B-6 | FR-SAVED-* |
| T-B-8 | Home page (nickname, create/join/practice) | T-A-4, T-F-5 | FR-HOME-* |
| T-B-9 | E2E flows 1, 3 (account part) | T-B-5, T-D-3 | §17.3 |

#### Track C: Stats, data viz, quality and docs

| ID | Task | Deps | Refs |
|---|---|---|---|
| T-C-1 | `ChartWithTable<T>` generic component + race WPM chart (used by results, practice and saved race) | T-F-5 | §15.4, §15.5 |
| T-C-2 | `GET /me/races` + `GET /me/stats` (aggregation service, rolling average) + tests | T-B-1, T-F-4 | §13, FR-STATS-* |
| T-C-3 | StatsPage: summary cards, trend/accuracy/outcome charts, filters in URL, history table with pagination, empty/loading/error states | T-C-1, T-C-2, T-B-2 | FR-STATS-* |
| T-C-4 | E2E axe flow (6) + stats portion of flow 3 | T-C-3, T-D-3 | §17.3 |
| T-C-5 | Lighthouse audit + fixes (bundle splitting, caching headers, CLS) | M2 | §16.1 |
| T-C-6 | Docs: `system.md`, `api.md`, `data-model.md`, `setup.md`, ADRs (except 0011/0012), README | ongoing; complete by M2 | §19 |
| T-C-7 | Clean-machine setup test (someone who didn't write `setup.md` follows it) | T-C-6 | §19 |
| T-C-8 | Video demo script + recording | M3 | §3 |

#### Track D: CI/CD and DevOps (owned by the CI/CD owner)

| ID | Task | Deps | Refs |
|---|---|---|---|
| T-D-1 | CI workflow: `lint-typecheck`, `test` (Postgres service, migrate, seed), `build` jobs; npm caching; PR template; branch protection on `main` requiring all jobs | T-F-1 (can start with placeholder scripts) | §18.1, §21 |
| T-D-2 | Neon project + Render web service, `render.yaml`, env vars and secrets, health check, CI-gated auto-deploy (or deploy-hook fallback), production seed | T-F-3, T-F-4 | §18.2, §18.3 |
| T-D-3 | E2E harness: `playwright.config.ts` with `webServer` running the production build, test DB setup/seed, timing env overrides, two-context helper for duel tests, `e2e` CI job, HTML report artifact on failure. Ship one smoke test (home page loads) | T-D-1, T-F-5 | §17.3, §18.1 |
| T-D-4 | Coverage reporting in CI (summary in the job output) and a README CI status badge | T-D-1 | §17 |
| T-D-5 | Automated Lighthouse check in CI on the production build (`@lhci/cli`, assert ≥ 90 per category on the §16.1 pages). Start non-blocking and make it blocking by M3. Needs an ADR addendum (new dev dependency) | T-D-3 | §16.1 |
| T-D-6 | `docs/deployment.md` (incl. rollback and secret rotation), ADR 0011 (hosting/CI-gated deploys), ADR 0012 (testing strategy), README deploy section | T-D-2 | §19 |
| T-D-7 | Bus-factor walkthrough: another member performs a deploy and rollback from the docs | T-D-6, before M3 | §18.0 |
| T-D-8 | Video demo segment: pipeline run, blocked PR on failing test, deploy to Render | M3 | §3 |

> **M0 note:** T-D-1 and T-D-2 are part of the M0 exit criteria (CI green, app deployed with `/api/v1/health` returning ok).

> **Integration points to watch:** T-A-7 (RoomPage) uses T-C-1 (charts) for results. T-B-6 needs T-A-5's results data. T-B-4 reuses T-A-1/T-A-2's engine. Agree on these interfaces early. They are already defined in `shared/` by T-F-2, which is why T-F-2 must merge first.

---

## 23. Changelog

| Date | Version | Change |
|---|---|---|
| 2026-11-21 | 1.0 | Initial agreed baseline. |
| 2026-11-21 | 1.1 | Added CI/CD owner role (§18.0) and Track D; moved CI/deploy tasks out of Track 0; added agent rule 12; task tracking moved to Trello. |
