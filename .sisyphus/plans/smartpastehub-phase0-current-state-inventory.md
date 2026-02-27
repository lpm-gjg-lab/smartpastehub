# SmartPasteHub Phase 0 Current State Inventory

Date: 2026-02-23
Scope: repository baseline for redesign phases in `.sisyphus/plans/smartpastehub-redesign-execution-checklist.md`

## 1) Runtime Architecture Snapshot

- Main process entrypoint is `src/main/index.ts`.
- Renderer shell is `src/renderer/App.tsx`.
- Main process registers all IPC in a single file `src/main/ipc-handlers.ts`.
- Database access is through `src/main/db.ts` (better-sqlite3 wrapper + schema init).

## 2) Domain Inventory (Evidence-Based)

### Main Process

- `src/main/index.ts`
  - App bootstrap, window creation, tray, hotkeys, extension server, clipboard watcher wiring.
  - Registers IPC through `registerIpcHandlers(mainWindow, db, createFloatingWindow)`.
- `src/main/ipc-handlers.ts`
  - Monolithic IPC file using `safeHandle()` wrapper and `ipcMain.handle()`.
  - Contains settings, clipboard, history, snippets, templates, security, AI/OCR, productivity, usage summary, window open.
- `src/main/clipboard-watcher.ts`
  - Polling watcher emits `{ text, html }` only, no target-app context signal.

### Core Cleaning

- `src/core/cleaner.ts`
  - Branch-based transform flow (`applyTransforms`) with type detection then sensitive scan.
  - Not middleware-based yet.

### Security

- Sensitive scan integrated into cleaner (`src/core/cleaner.ts`).
- Auto-clear scheduling used from main process (`src/main/index.ts` imports `src/security/auto-clear.ts`).
- Context-aware policy by target app is not implemented.

### Database and Persistence

- `src/main/db.ts`
  - Creates tables/indexes for `clipboard_history`, `snippets`, `templates`, `usage_daily`, `context_rules`, `regex_rules`.
  - Includes FTS virtual table `history_fts`.
- IPC handlers call raw SQL via `db.run/db.all/db.get` directly in `src/main/ipc-handlers.ts`.

### Renderer UI

- Active shell routes in `src/renderer/App.tsx` currently render:
  - Smart Paste
  - History
  - Settings
- Sidebar currently contains three active tabs in `src/renderer/components/AppSidebar.tsx`.
- Placeholder pages exist in `src/renderer/pages/Placeholders.tsx` (Snippets/Templates/AI/Sync/Plugins marked coming soon).
- Additional floating/utility windows exist in `src/renderer/windows/*.tsx`.

### State Management

- Zustand store exists and is active: `src/renderer/stores/useSmartPasteStore.ts`.
- This means state management is present, but not yet standardized for all future pages/features.

### Plugins

- Plugin contracts exist in `src/plugins/plugin-api.ts`.
- Loader and in-memory registry exist in `src/plugins/plugin-loader.ts` and `src/plugins/plugin-store.ts`.
- Hooks are not wired into cleaning runtime yet.

### Sync and OCR

- Sync is scaffolded/stub-like:
  - `src/sync/sync-manager.ts` sets optimistic connection and comments out transport send.
  - `src/sync/pairing.ts` returns placeholder pairing code.
  - `src/sync/relay-client.ts` only defines message shape helper.
- Relay server currently replies with pong only: `relay-server/src/index.ts`.
- OCR engine is placeholder return object in `src/ocr/ocr-engine.ts`.

### Tests

- Unit tests present in `tests/core/*`, `tests/security/*`, `tests/converter/*`.
- E2E tests present in `tests/e2e/smart-paste.spec.ts`.
- Vitest include patterns are `tests/**/*.test.ts` and `tests/**/*.spec.ts` in `vitest.config.ts`.

## 3) IPC Contract Reality and Mismatches

Source of typed IPC contracts: `src/shared/ipc-types.ts`.
Runtime implementation: `src/main/ipc-handlers.ts`.

### Key mismatches and missing typed channels

- `clipboard:paste` mismatch:
  - Typed: `{ preset, transforms }`
  - Runtime: `{ preset, text, html }`
- `security:mask` mismatch:
  - Typed: `{ mode, matches }`
  - Runtime: `{ mode, matches, text }`
- Implemented but not in `src/shared/ipc-types.ts`:
  - `clipboard:write`
  - `snippet:update`, `snippet:delete`
  - `template:list`, `template:create`, `template:update`, `template:delete`
  - `ocr:recognize`
  - `queue:*` and `multi:*`
  - `usage:summary`
  - `window:open`

## 4) Raw SQL Locations (Monolith Coupling Evidence)

All are in `src/main/ipc-handlers.ts`:

- Insert history: around `clipboard:paste` handler.
- History list and FTS query: `history:list` handler.
- Pin/delete history: `history:pin`, `history:delete`.
- Snippet CRUD: `snippet:*` handlers.
- Template CRUD/fill: `template:*` handlers.
- Usage summary aggregation query: `usage:summary` handler.

This confirms Phase 1 repository extraction remains required.

## 5) Invariants Locked for Refactor

- IPC channel names must remain stable during Phase 1 and Phase 2.
- `IPCResponseEnvelope<T>` shape in `src/shared/ipc-response.ts` must stay unchanged.
- Error payload semantics (code/message/recoverable) must stay unchanged.
- Cleaner external behavior must remain backward-compatible until parity tests pass.
- Database schema compatibility must be preserved for existing local user DB file.

## 6) Baseline Quality Gates (Phase 0)

Commands run on 2026-02-23 (latest baseline):

- `npm run typecheck` -> PASS
- `npm test` -> PASS (6 files, 9 tests)
- `npm run test:e2e` -> PASS (4 tests)

Note on stabilization:

- Playwright config was hardened to avoid reusing unrelated existing server and to enforce local strict port:
  - `baseURL` and `webServer.url` pinned to `http://127.0.0.1:5173`
  - `webServer.command` uses `--strictPort`
  - `reuseExistingServer` set to `false`

Conclusion: Phase 0 inventory, invariants, and quality gate are now met.
