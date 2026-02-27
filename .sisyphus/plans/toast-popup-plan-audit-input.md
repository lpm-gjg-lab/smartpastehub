# Audit Input: Toast & Popup Plan

## Source Documents

- `implementation_plan_last.md`
- `task_last.md`

## Audit Goal

Evaluate whether the implementation plan is executable, scoped correctly, non-contradictory, testable, and aligned to current SmartPasteHub architecture.

## Consolidated Plan Summary

### Phase A (Accessibility Critical)

- Add dialog semantics, Escape handling, focus trap, and autofocus for:
  - `FloatingWindowShell.tsx`
  - `ToastApp.tsx`
  - `Onboarding.tsx`
- Improve keyboard behavior and labels for `Toast.tsx`.
- Wire `#sr-announcer` in `App.tsx` and emit announcements for key IPC events.

### Phase B (Toast UX)

- Remove duplicate OS notifications from `src/main/index.ts` after confirming toast reliability.
- Limit visible toasts to max 3 in `useToastStore.ts`.
- Add delete undo flow in `HistoryPage.tsx` with temporary cache/restore path.
- Add pause/resume toast timers (hover/focus) via store + `Toast.tsx` event handlers.

### Phase C (Missing Toast Events)

- Add toast listeners/events for:
  - `clipboard:auto-cleared`
  - `sync:connected` / `sync:disconnected`
  - `sync:received`
  - AI completion events

### Phase D (Toast/Popup Action Expansion)

- Add `Save as Snippet` action in floating toast.
- Add multi-clipboard and queue indicators in toast header.
- Add JSON/YAML/TOML conversion actions and IPC transform endpoint.
- Add OCR popup and OCR backend integration.
- Expose missing AI actions (`fix_grammar`, `rephrase`, `formalize`) in toast action bar.

### Phase E (Polish)

- Add descriptive `aria-label` + `aria-busy` on toast action buttons.
- Add number-key shortcuts (1-9) for toast actions.
- Add reduced-motion and forced-color CSS support.

### Verification Section

- Unit tests for modal/toast/store accessibility and behavior.
- Manual verification for cross-window Electron flows that jsdom cannot fully simulate.

## Key Concerns to Audit

- Scope risk: plan includes many features beyond "toast/popup" and can become a rewrite.
- Architecture fit: app already changed in multiple phases; ensure no stale assumptions.
- Contradictions: `task_last.md` phases differ from `implementation_plan_last.md` phase structure.
- Testability: identify which items are truly unit-testable vs integration/manual only.
- Dependency ordering: identify blockers and safe sequencing.
- Security/reliability: assess risks around undo restore, OCR engine integration, and new IPC events.

## Expected Audit Output

1. Verdict: approve / approve-with-major-changes / reject-until-reworked.
2. Top critical flaws and why they matter.
3. Concrete rewrite proposal for phased execution.
4. Must-do / defer cutline.
5. Verification matrix (unit/integration/e2e/manual) per feature group.
