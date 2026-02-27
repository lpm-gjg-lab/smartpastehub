# Proposal Redesign SmartPasteHub

## Goal

SmartPasteHub remains a smart clipboard assistant that cleans formatting, detects sensitive data, and improves copy-paste productivity.

## Current Architecture Problems

| Area              | Problem                                  | Impact                                            |
| ----------------- | ---------------------------------------- | ------------------------------------------------- |
| Cleaning Pipeline | Single linear flow, hard to extend       | New transforms require editing core cleaner logic |
| IPC Handlers      | One monolithic file with many channels   | Hard to maintain and reason about ownership       |
| Database          | Raw SQL embedded in handlers             | Low testability, weak abstraction, higher risk    |
| OCR & Sync        | Stub/placeholder                         | Promised features not usable                      |
| Plugin System     | API exists but not connected to cleaning | Plugins cannot affect core transform path         |
| Frontend          | Only 3 simple pages                      | Missing dashboard, analytics, richer workflows    |
| Security          | Timer-only auto-clear                    | No context awareness by target application        |
| State Management  | No structured global store               | Duplicate fetch logic, weak caching model         |
| Error Handling    | Catch-all logs with no recovery          | User lacks retry/recovery path                    |
| Testing           | Minimal coverage                         | Refactor risk remains high                        |

## Proposed Redesign

### 1) Pipeline-Based Cleaning (Middleware)

Move from hardcoded if-else to composable middleware chain.

Pipeline flow:

1. Detect content type
2. Execute selected middleware sequence:
   - HTML stripper (optional)
   - Line break fixer (optional)
   - Table converter (optional)
   - Whitespace normalizer (required)
   - Regex rules (user-defined)
   - AI rewriter (optional)
   - Custom plugin middleware
3. Run security scanner
4. Return cleaned output

Benefits:

- User-configurable ordering and enable/disable control
- Plugin injection into pipeline
- Fine-grained unit testing per middleware

### 2) Repository Pattern for Database

Move SQL out of IPC handlers into repositories.

Planned repositories:

- `clipboard-history.repo.ts`
- `snippets.repo.ts`
- `templates.repo.ts`
- `context-rules.repo.ts`
- `regex-rules.repo.ts`
- `usage-stats.repo.ts`

Benefits:

- IPC handlers focus on routing
- Repositories can be mocked in tests
- Query logic centralized and optimizable

### 3) Modular IPC Handlers

Split one large IPC file into domain modules:

- `clipboard.ipc.ts`
- `history.ipc.ts`
- `snippet.ipc.ts`
- `template.ipc.ts`
- `security.ipc.ts`
- `ai.ipc.ts`
- `ocr.ipc.ts`
- `productivity.ipc.ts`
- `settings.ipc.ts`
- `index.ts` to register all

### 4) Frontend Redesign: Dashboard + Floating Popup

Expand to pages:

- Dashboard
- Smart Paste
- History (filters, date range, bulk actions)
- Snippets & Templates
- Plugins
- Settings (tabbed/accordion)

Floating popup behavior:

- Appears near cursor on copy detection
- Quick actions: clean paste, original paste, save snippet
- Short preview + content type badge

### 5) Context-Aware Security

Replace timer-only behavior with context decisions:

- Sensitive data + chat app target => block + strong warning
- Sensitive data + local editor => allow + reminder
- Sensitive data + browser form => allow + auto-clear after paste
- Auto-clear if unused after timeout

### 6) Functional Cross-Device Sync

Implement end-to-end encrypted sync via relay.

Pairing flow:

- Desktop generates QR with relay URL + AES key
- Mobile scans and stores key securely

Sync flow:

- Device A copy -> encrypt -> websocket relay -> Device B decrypt -> write local clipboard -> notify

Relay server constraints:

- Transport only; cannot read payload
- Room-based separation per paired devices

### 7) Testing Strategy

Unit (Vitest):

- Middleware
- Repositories
- Security patterns
- Converters

Integration:

- IPC -> repository -> database
- End-to-end cleaning pipeline
- Settings read/write cycle

E2E (Playwright):

- Onboarding
- Copy -> detect -> clean paste
- History search & pin
- Settings hotkey updates

### 8) Useful Plugin System

Plugin capabilities:

- Add middleware to cleaning pipeline
- Add content detectors
- Add security patterns
- Add sidebar pages
- Add floating popup actions

Example plugin ideas:

- Jira formatter
- JSON/XML beautifier
- Translation plugin
- Slack emoji cleaner

## Proposed Folder Structure

```text
src/
├── main/
│   ├── index.ts
│   ├── windows/
│   │   ├── main-window.ts
│   │   └── floating-popup.ts
│   ├── ipc/
│   ├── services/
│   ├── repositories/
│   └── database/
├── pipeline/
│   ├── pipeline-runner.ts
│   ├── middlewares/
│   └── types.ts
├── security/
│   ├── scanner.ts
│   ├── masker.ts
│   ├── patterns/
│   └── context-guard.ts
├── plugins/
│   ├── plugin-api.ts
│   ├── plugin-loader.ts
│   ├── plugin-registry.ts
│   └── builtin/
├── sync/
│   ├── sync-manager.ts
│   ├── encryption.ts
│   ├── pairing.ts
│   └── relay-client.ts
├── renderer/
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   ├── stores/
│   ├── hooks/
│   └── styles/
└── shared/
    ├── types.ts
    ├── constants.ts
    ├── logger.ts
    └── ipc-channels.ts
```

## Change Summary

| Aspect         | Current             | Redesign                                |
| -------------- | ------------------- | --------------------------------------- |
| Cleaning       | Hardcoded flow      | Reorderable middleware pipeline         |
| Database       | SQL in IPC handlers | Repository abstraction                  |
| IPC            | Monolith            | Modular by domain                       |
| Frontend       | 3 static pages      | 6 pages + floating popup + dashboard    |
| Security       | Timer-based         | Context-aware by target app             |
| Plugin         | API disconnected    | Middleware/UI/security extension points |
| Sync           | Stub                | Full E2E encrypted sync                 |
| Testing        | Minimal             | Unit + Integration + E2E                |
| Error handling | Catch-all           | Retry + recovery options                |

## Constraint

This redesign must preserve the product mission and improve modularity, testability, extensibility, and reliability without breaking core clipboard workflows.
