# AGENTS.md

This repo is **KeyClashr**, a real-time 1v1 typing race app (React + TypeScript + Express + Socket.IO + Prisma/Postgres).

## Before doing anything

1. **Read `requirements.md`** in the repo root. It is the source of truth for scope, architecture, API/socket contracts, data model, conventions and the task backlog.
2. Follow the **Agent rules in §0.1** of `requirements.md`. In short:
   - Build only what the spec describes. Ask the human when something is ambiguous. Never build items from §2.2 (out of scope).
   - Use the contracts in §12–§14 exactly. Shared types live in `shared/`. Import them and never redefine them.
   - Strict TypeScript: no `any`, no `@ts-ignore`, no non-null `!`. Validate all external input with Zod.
   - Every UI handles loading, empty and error states, and meets WCAG 2.1 AA (§16.3).
   - Add or update tests with every logic change (§17).
   - No new dependencies without human approval and an ADR.
   - Don't modify CI/CD files (`.github/workflows/**`, `render.yaml`, `e2e/playwright.config.ts`) unless the task is in Track D or the CI/CD owner agreed (§18.0).
   - Update `docs/` (and `requirements.md` via a separate `spec:` PR) when changing APIs, events, env vars or schema.
3. Work maps to a **task ID** from §22 (e.g. `T-A-3`). Use it in the branch name (`feat/T-A-3-room-machine`) and PR title.
4. Meet the **Definition of Done** in §21.1 before calling a task complete.
