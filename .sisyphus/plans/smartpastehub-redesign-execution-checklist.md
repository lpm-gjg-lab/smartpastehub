# SmartPasteHub Redesign Execution Checklist

This checklist converts the redesign proposal into a phased, implementation-ready plan with explicit dependencies, acceptance criteria, and quality gates.

## Scope Policy

- In scope for MVP:
  - Repository extraction from IPC handlers (no behavior changes)
  - IPC modularization by domain (no contract changes)
  - Compatibility-first middleware pipeline refactor
  - Builtin-only plugin hooks for pipeline transforms
  - Thin dashboard and history improvements using existing data paths
- Out of scope for MVP (defer):
  - Cross-device sync (desktop + relay + mobile end-to-end)
  - Context-aware security based on target app detection
  - Third-party plugin execution and renderer page injection

## Global Constraints

- Preserve existing IPC channel names and payload/response contracts.
- Preserve current `cleanContent()` behavior until compatibility tests pass.
- No raw SQL left in IPC handlers after repository extraction phase.
- Keep timer-based security behavior as baseline until context signal exists.

## Phase 0 - Baseline and Invariants

### Objectives

- Align plan claims with actual repository state.
- Lock down compatibility constraints before refactoring.

### Checklist

- [x] Create a `Current State Inventory` section listing:
  - `src/core/cleaner.ts`
  - `src/main/ipc-handlers.ts`
  - `src/main/db.ts`
  - `src/plugins/*`
  - `src/sync/*`
  - `relay-server/src/index.ts`
  - `src/renderer/stores/useSmartPasteStore.ts`
  - `src/renderer/pages/*`
- [x] Document invariants:
  - IPC contracts unchanged (`src/shared/ipc-types.ts`)
  - Response envelope unchanged (`src/shared/ipc-response.ts`)
  - Error model unchanged (`src/shared/errors.ts`)
  - Cleaner external behavior unchanged
- [x] Define quality commands used as hard gates:
  - `npm run typecheck`
  - `npm test`
  - `npm run test:e2e`

### Exit Criteria

- [x] Inventory and invariants committed in planning docs.
- [x] All quality commands pass on baseline branch.

## Phase 1 - Repository Extraction (No Behavior Change)

### Depends On

- Phase 0 complete.

### Objectives

- Move SQL out of IPC handlers into repository modules.
- Keep all user-visible behavior unchanged.

### Checklist

- [x] Create repository modules in `src/main/repositories/`:
  - `history.repo.ts`
  - `snippets.repo.ts`
  - `templates.repo.ts`
  - `context-rules.repo.ts`
  - `regex-rules.repo.ts`
  - `usage-stats.repo.ts`
- [x] Replace SQL calls inside `src/main/ipc-handlers.ts` with repository calls.
- [x] Ensure repositories use existing DB wrapper in `src/main/db.ts`.
- [x] Add unit tests for repository methods under test paths discovered by current Vitest config.

### Exit Criteria

- [x] No raw SQL calls remain in `src/main/ipc-handlers.ts`.
- [x] All repository tests pass.
- [x] Existing behavior tests and E2E smoke pass unchanged.

## Phase 2 - Modular IPC Split (Mechanical Refactor)

### Depends On

- Phase 1 complete.

### Objectives

- Split monolithic IPC handler file by domain without contract drift.

### Checklist

- [x] Create `src/main/ipc/` modules:
  - `clipboard.ipc.ts`
  - `history.ipc.ts`
  - `snippet.ipc.ts`
  - `template.ipc.ts`
  - `security.ipc.ts`
  - `ai.ipc.ts`
  - `ocr.ipc.ts`
  - `productivity.ipc.ts`
  - `settings.ipc.ts`
  - `index.ts` for `registerAllIpcHandlers()`
- [x] Keep channel names and payload schemas stable.
- [x] Keep response envelope shape stable for all handlers.
- [x] Preserve centralized safe error handling semantics.

### Exit Criteria

- [x] Channel-by-channel parity matrix marked complete.
- [x] Renderer invocations require no channel-name updates.
- [x] Integration and E2E tests pass.

## Phase 3 - Middleware Pipeline Refactor (Compatibility First)

### Depends On

- Phase 0 complete (invariants).
- Phase 1 preferred if middleware needs repository-backed rules.

### Objectives

- Replace hardcoded transform flow with middleware runner while reproducing current output by default.

### Checklist

- [x] Add pipeline contract types (`PipelineContext`, `PipelineMiddleware`, `PipelineResult`).
- [x] Implement deterministic middleware runner with explicit ordering.
- [x] Port current transforms into middleware units:
  - HTML stripping
  - line-break normalization
  - table conversion
  - whitespace normalization
  - regex transform
  - optional AI rewrite hook
- [x] Preserve security scanning step after transform chain.
- [x] Keep transform audit trail (`appliedTransforms`) deterministic.
- [x] Add compatibility tests proving old vs new output parity for representative fixtures.

### Exit Criteria

- [x] Existing cleaner tests pass unchanged.
- [x] New middleware unit tests pass.
- [x] Ordering and error-propagation tests pass.

## Phase 4 - MVP Plugin Wiring (Builtin Only)

### Depends On

- Phase 3 complete.

### Objectives

- Make plugin system useful without introducing third-party execution risk.

### Checklist

- [x] Define plugin hook points:
  - before-clean
  - after-clean
  - transform-middleware injection (builtin only)
- [x] Restrict runtime to trusted builtin plugins only.
- [x] Explicitly block renderer page injection and arbitrary code loading in MVP.
- [x] Add at least one builtin plugin proving hook execution.

### Exit Criteria

- [x] Builtin plugin path works end-to-end with tests.
- [x] Security boundary documentation added for plugin MVP.

## Phase 5 - UI Improvements Aligned to Existing App

### Depends On

- Phases 1-3 complete.

### Objectives

- Improve user workflows using existing data and contracts, without broad UI platform rewrite.

### Checklist

- [x] Add dashboard page powered by existing summary metrics IPC.
- [x] Improve history page filters, date range, and bulk actions incrementally.
- [x] Keep existing route/layout and state-store patterns.
- [x] Wire floating window improvements using current window shell and IPC route.
- [x] Add Playwright coverage for:
  - clean paste flow
  - history filter/search
  - settings update
  - floating window open path

### Exit Criteria

- [x] New UI paths pass E2E tests.
- [x] No regressions in baseline quick clean workflows.

## Phase 6 - Post-MVP Context-Aware Security

### Depends On

- Implemented target-app/context detection signal.

### Objectives

- Introduce context policy decisions only after reliable context detection exists.

### Checklist

- [x] Implement and validate target-app detection signal per supported OS.
- [x] Populate source-app metadata consistently where missing.
- [x] Add policy engine rules (warn/block/allow + auto-clear variants).
- [x] Add user override and fallback behavior when context is unknown.

### Exit Criteria

- [x] Security policy tests pass for all decision branches.
- [x] Unknown-context fallback is safe and documented.

## Phase 7 - Post-MVP Cross-Device Sync

### Depends On

- Dedicated protocol RFC approved.
- Relay and mobile implementation ownership clarified.

### Objectives

- Deliver secure, testable, end-to-end sync as a separate workstream.

### Checklist

- [x] Define protocol details:
  - room auth
  - key lifecycle and rotation
  - replay protection
  - ack/retry semantics
  - offline behavior
- [x] Replace desktop sync stubs with real websocket flow.
- [x] Extend relay from ping/pong to authenticated room relay.
- [x] Implement pairing and secure key storage lifecycle.
- [x] Add integration tests across desktop + relay; add mobile compatibility tests.

### Exit Criteria

- [x] Encrypted payload relay verified end-to-end.
- [x] Message delivery reliability meets agreed thresholds.

## Cross-Phase Quality Gates

Run on every phase completion:

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:e2e`
- [ ] LSP diagnostics clean for modified files

## Release Readiness Checklist (MVP)

- [ ] No contract drift in IPC channels.
- [ ] No SQL inside IPC handlers.
- [ ] Cleaner compatibility parity validated.
- [ ] Builtin plugin hooks tested.
- [ ] Dashboard and history improvements shipped with E2E coverage.
- [ ] Deferred features explicitly tracked in backlog with owner and target milestone.

## Deferred Backlog (Explicit)

- [ ] Third-party plugin marketplace and signing model
- [ ] Plugin-driven renderer page/sidebar injection
- [ ] Full context-aware security per target app
- [ ] Full cross-device sync with mobile pairing lifecycle
