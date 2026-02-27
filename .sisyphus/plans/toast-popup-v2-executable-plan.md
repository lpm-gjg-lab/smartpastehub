# SmartPasteHub Toast/Popup V2 (Executable Plan)

Goal: add missing toast/popup feedback and improve accessibility using the architecture that is active today.

## Ground Rules (Repo-Aligned)

- Primary UI target is in-app toast stack (`src/renderer/components/Toast.tsx`, `src/renderer/stores/useToastStore.ts`).
- Event bridge target is `window.smartpaste` from `src/main/preload.ts`.
- Do not depend on `window.floatingAPI` unless it is explicitly implemented in a separate track.
- Keep changes incremental and testable; avoid large cross-window rewrites.

## Phase 1 - Accessibility Hardening (Must-Do First)

### Scope

- Improve keyboard and screen-reader behavior of existing in-app toasts.
- Wire screen reader announcer for key IPC events.

### Files

- `src/renderer/components/Toast.tsx`
- `src/renderer/stores/useToastStore.ts`
- `src/renderer/App.tsx`

### Tasks

- Add keyboard support for each toast item:
  - Escape dismisses the focused toast.
  - Enter/Space can trigger primary action when present.
- Make each toast focusable and navigable (`tabIndex=0` on toast root item).
- Ensure close/action buttons have consistent `aria-label` and accessible names.
- Implement `announce(message)` utility in `App.tsx` using `#sr-announcer` and call it on:
  - `clipboard:content`
  - `clipboard:cleaned`
  - `security:alert`
  - `security:policy`

### Acceptance Criteria

- Keyboard-only user can focus, dismiss, and trigger toast actions.
- Screen reader announces key app-state events exactly once.

## Phase 2 - Toast UX Reliability

### Scope

- Reduce noise, improve stack behavior, and add safer dismiss interactions.

### Files

- `src/renderer/stores/useToastStore.ts`
- `src/renderer/components/Toast.tsx`
- `src/main/index.ts`
- `src/renderer/pages/HistoryPage.tsx`

### Tasks

- Add stacking limit (max 3 visible toasts, newest kept).
- Add pause/resume timer support in store:
  - pause on hover/focus,
  - resume with remaining duration.
- Remove duplicate OS notifications in `src/main/index.ts` only after in-app toasts verified stable.
- Add undo flow for delete operations in `HistoryPage.tsx`:
  - cache deleted records in memory for short window,
  - expose undo action in toast.

### Acceptance Criteria

- Toast overflow is controlled and deterministic.
- Hover/focus prevents premature auto-dismiss.
- Delete undo restores removed entries within timeout window.

## Phase 3 - Missing Feedback Events

### Scope

- Add missing toast feedback for important background flows.

### Files

- `src/main/index.ts`
- `src/security/auto-clear.ts` (or call site wrappers)
- `src/sync/sync-manager.ts`
- `src/renderer/App.tsx`

### Tasks

- Emit and handle additional events:
  - `clipboard:auto-cleared`
  - `sync:connected`
  - `sync:disconnected`
  - `sync:received`
- Add renderer listeners in `App.tsx` and show appropriately typed toasts.

### Acceptance Criteria

- Every listed event produces user-visible toast feedback.
- No duplicate toasts for the same trigger path.

## Phase 4 - Popup/Action Improvements (Repo-Compatible)

### Scope

- Add practical quick actions through existing channels without introducing a new bridge.

### Files

- `src/renderer/components/toast/ToastActionBar.tsx`
- `src/renderer/components/toast/toastActions.ts`
- `src/main/ipc/index.ts`
- `src/main/ipc/*.ts` (new transform IPC module if needed)
- `src/shared/ipc-types.ts`

### Tasks

- Add "Save as Snippet" action via existing `snippet:create` IPC.
- Add format-conversion action path (JSON/YAML/TOML) with explicit IPC registration in modular IPC index.
- Add missing AI action buttons (`fix_grammar`, `rephrase`, `formalize`) mapped to existing `ai:rewrite` mode semantics.

### Acceptance Criteria

- New actions execute successfully from UI.
- New IPC channels are registered and typed.

## Optional Track (Separate RFC)

Only start this if product explicitly wants dedicated floating-toast architecture.

- Implement `window.floatingAPI` in `src/main/preload.ts`.
- Add `#/toast` route in `src/renderer/main.tsx` and lifecycle wiring in main process.
- Migrate toast/popup plan items that truly require separate toast window.

## Verification Matrix

### Unit

- `Toast` keyboard and ARIA behavior.
- `useToastStore` stacking + pause/resume timer logic.
- Undo cache behavior for History delete.

### Integration

- IPC event -> renderer toast rendering for new channels.
- Action button -> IPC invoke -> success/fail toast state.

### E2E

- Keyboard navigation and dismissal in toast flows.
- History delete + undo roundtrip.

### Manual (Electron multi-window constraints)

- Verify no duplicate notifications across OS + in-app path.
- Verify sync connected/disconnected/received user feedback in real runtime.

## Execution Order

1. Phase 1 (a11y hardening)
2. Phase 2 (reliability + stack/timer)
3. Phase 3 (missing events)
4. Phase 4 (actions)
5. Optional track only if explicitly approved
