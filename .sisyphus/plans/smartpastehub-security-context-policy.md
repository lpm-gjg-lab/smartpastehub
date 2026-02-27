# SmartPasteHub Context-Aware Security Policy

Scope: Phase 6 implementation baseline.

## Decision Inputs

- `hasSensitiveData` from security scanner.
- Active app signal (`appName`, `appType`) from `active-app-detector`.
- User security settings:
  - `autoClear`
  - `clearTimerSeconds`
  - `unknownContextAction`

## Policy Decisions

- Sensitive + `chat` -> `block`
- Sensitive + `browser` -> `warn` + forced short auto-clear (<= 30s)
- Sensitive + `editor` -> `warn` (allow with reminder)
- Sensitive + `unknown` -> fallback policy + safe behavior
- Non-sensitive -> `allow` (auto-clear follows user setting)

## Unknown Context Fallback

- Default `unknownContextAction` is `warn`.
- If unknown context action stays `warn`, fallback enforces 30s auto-clear.
- User override is supported via setting `security.unknownContextAction` (`allow|warn|block`).

## Integration Points

- Hotkey flow: `src/main/index.ts` (block/warn/allow before writing clipboard).
- IPC paste flow: `src/main/ipc/clipboard.ipc.ts` (decision emitted via `security:policy`, metadata persisted).
- History metadata: source app persisted through `source_app` in repository create path.

## Safety Notes

- Block decisions stop clipboard overwrite in hotkey flow.
- Warn decisions surface notification/toast and can schedule auto-clear.
- Fallback behavior remains conservative when app detection is uncertain.
