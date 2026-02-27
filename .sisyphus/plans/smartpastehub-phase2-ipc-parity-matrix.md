# SmartPasteHub Phase 2 IPC Parity Matrix

Purpose: prove modular IPC split keeps channel behavior and names stable.

## Channel Mapping (Old Monolith -> New Module)

| Channel            | New Module                         |
| ------------------ | ---------------------------------- |
| `settings:get`     | `src/main/ipc/settings.ipc.ts`     |
| `settings:update`  | `src/main/ipc/settings.ipc.ts`     |
| `clipboard:write`  | `src/main/ipc/clipboard.ipc.ts`    |
| `clipboard:paste`  | `src/main/ipc/clipboard.ipc.ts`    |
| `clipboard:detect` | `src/main/ipc/clipboard.ipc.ts`    |
| `security:mask`    | `src/main/ipc/security.ipc.ts`     |
| `security:scan`    | `src/main/ipc/security.ipc.ts`     |
| `history:list`     | `src/main/ipc/history.ipc.ts`      |
| `history:pin`      | `src/main/ipc/history.ipc.ts`      |
| `history:delete`   | `src/main/ipc/history.ipc.ts`      |
| `snippet:list`     | `src/main/ipc/snippet.ipc.ts`      |
| `snippet:create`   | `src/main/ipc/snippet.ipc.ts`      |
| `snippet:update`   | `src/main/ipc/snippet.ipc.ts`      |
| `snippet:delete`   | `src/main/ipc/snippet.ipc.ts`      |
| `template:fill`    | `src/main/ipc/template.ipc.ts`     |
| `template:list`    | `src/main/ipc/template.ipc.ts`     |
| `template:create`  | `src/main/ipc/template.ipc.ts`     |
| `template:update`  | `src/main/ipc/template.ipc.ts`     |
| `template:delete`  | `src/main/ipc/template.ipc.ts`     |
| `ai:rewrite`       | `src/main/ipc/ai.ipc.ts`           |
| `ocr:recognize`    | `src/main/ipc/ocr.ipc.ts`          |
| `queue:enqueue`    | `src/main/ipc/productivity.ipc.ts` |
| `queue:dequeue`    | `src/main/ipc/productivity.ipc.ts` |
| `queue:peek`       | `src/main/ipc/productivity.ipc.ts` |
| `queue:size`       | `src/main/ipc/productivity.ipc.ts` |
| `queue:clear`      | `src/main/ipc/productivity.ipc.ts` |
| `multi:start`      | `src/main/ipc/productivity.ipc.ts` |
| `multi:add`        | `src/main/ipc/productivity.ipc.ts` |
| `multi:merge`      | `src/main/ipc/productivity.ipc.ts` |
| `multi:clear`      | `src/main/ipc/productivity.ipc.ts` |
| `multi:state`      | `src/main/ipc/productivity.ipc.ts` |
| `usage:summary`    | `src/main/ipc/usage.ipc.ts`        |
| `window:open`      | `src/main/ipc/window.ipc.ts`       |

## Safety Envelope

- All channels continue to register through `safeHandle` behavior from `src/main/ipc/safe-handle.ts`.
- Error response shape remains `IPCResponseEnvelope<T>` from `src/shared/ipc-response.ts`.
- Top-level integration point remains `registerIpcHandlers(...)` in `src/main/ipc-handlers.ts`, now delegating to `registerAllIpcHandlers(...)` in `src/main/ipc/index.ts`.

## Verification Notes

- Typecheck passes.
- Unit tests pass.
- Build passes.
- Playwright E2E passes.
