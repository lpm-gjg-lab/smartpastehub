# implementation_plan_last / task_last Status Matrix

Status legend:

- DONE: Implemented on active app path and verified in current repo.
- PARTIAL: Implemented in active path, but original floating-specific expectation is not fully wired.
- DEFERRED: Not implemented yet.

## Phase 1 - Accessibility Fixes

| Item                                                                   | Status  | Evidence                                                                                                                    |
| ---------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| FloatingWindowShell dialog semantics + keyboard close                  | DONE    | `src/renderer/components/FloatingWindowShell.tsx`                                                                           |
| ToastApp floating accessibility semantics (`role=alert`, focus/escape) | PARTIAL | Active path uses in-app toasts in `src/renderer/components/Toast.tsx`; floating `src/renderer/ToastApp.tsx` remains minimal |
| Onboarding modal dialog semantics and escape support                   | DONE    | `src/renderer/components/Onboarding.tsx`                                                                                    |
| Close buttons aria consistency                                         | DONE    | `src/renderer/components/Toast.tsx`, `src/renderer/components/FloatingWindowShell.tsx`                                      |
| Screen reader announcer wiring (`#sr-announcer`)                       | DONE    | `src/renderer/App.tsx`                                                                                                      |

## Phase 2 - Toast UX Improvements

| Item                                | Status | Evidence                                                                           |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Remove redundant notifications path | DONE   | Event-driven path in `src/main/index.ts`, toast handling in `src/renderer/App.tsx` |
| Toast stacking limit                | DONE   | `src/renderer/stores/useToastStore.ts`                                             |
| Undo action on delete               | DONE   | `src/renderer/pages/HistoryPage.tsx`                                               |
| Pause/resume timer (hover/focus)    | DONE   | `src/renderer/stores/useToastStore.ts`, `src/renderer/components/Toast.tsx`        |

## Phase 3 - Missing Toasts

| Item                               | Status   | Evidence                                                                                               |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| Clipboard auto-cleared toast       | DONE     | `src/main/index.ts`, `src/renderer/App.tsx`, `src/shared/ipc-types.ts`                                 |
| Sync connected/disconnected toasts | DONE     | `src/main/index.ts`, `src/renderer/App.tsx`, `src/shared/ipc-types.ts`                                 |
| Sync received toast                | DONE     | `src/main/index.ts`, `src/renderer/App.tsx`, `src/shared/ipc-types.ts`                                 |
| AI rewrite complete toast          | DONE     | `src/renderer/pages/SmartPastePage.tsx`                                                                |
| Plugin activated/failed toasts     | DEFERRED | No plugin toast channel found (`grep: plugin:activated/plugin:failed` no matches)                      |
| Multi-copy and queue toasts        | DONE     | `src/main/index.ts`, `src/main/ipc/productivity.ipc.ts`, `src/renderer/App.tsx`, `src/shared/types.ts` |

## Phase 4 - Feature Accessibility via Toast/Popup

| Item                                         | Status | Evidence                                                                                                                             |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Save as Snippet from toast action            | DONE   | `src/renderer/components/toast/ToastActionBar.tsx`, `src/renderer/components/toast/toastActions.ts`                                  |
| Multi-clipboard indicator                    | DONE   | `src/main/index.ts`, `src/main/ipc/productivity.ipc.ts`, `src/renderer/components/toast/ToastHeader.tsx`                             |
| JSON/YAML/TOML format converter actions      | DONE   | `src/renderer/components/toast/ToastActionBar.tsx`, `src/renderer/components/toast/toastActions.ts`, `src/main/ipc/transform.ipc.ts` |
| Paste queue indicator                        | DONE   | `src/main/ipc/productivity.ipc.ts`, `src/renderer/components/toast/ToastHeader.tsx`, `src/renderer/App.tsx`                          |
| OCR popup + backend integration              | DONE   | `src/renderer/windows/OCRPopup.tsx`, `src/renderer/main.tsx`, `src/main/ipc/ocr.ipc.ts`, `src/ocr/ocr-engine.ts`                     |
| Expanded AI actions (fix/rephrase/formalize) | DONE   | `src/renderer/components/toast/ToastActionBar.tsx`, `src/renderer/components/toast/toastActions.ts`, `src/shared/ipc-types.ts`       |

## Phase 5 - ToastActionBar Polish

| Item                                     | Status | Evidence                                                |
| ---------------------------------------- | ------ | ------------------------------------------------------- |
| Descriptive aria-label on action buttons | DONE   | `src/renderer/components/toast/ToastActionBar.tsx`      |
| `aria-busy` during AI loading            | DONE   | `src/renderer/components/toast/ToastActionBar.tsx`      |
| Keyboard shortcuts (1-9)                 | DONE   | `src/renderer/components/toast/ToastActionBar.tsx`      |
| Reduced motion and high-contrast support | DONE   | `src/renderer/styles/components/ToastWindow.module.css` |

## Phase 6 - Verification Snapshot

- Prior completed checks from latest implementation run: typecheck, vitest, build, and e2e passed.
- Additional OCR coverage added in this step:
  - `tests/ocr/ocr-engine.test.ts`
  - `tests/main/ocr-ipc.test.ts`

## Notes

- This matrix evaluates practical completion on the active architecture path (`window.smartpaste` + in-app toast route), as requested.
- Floating-only assumptions from `implementation_plan_last.md` are marked PARTIAL when equivalent behavior is intentionally implemented on active path instead.
