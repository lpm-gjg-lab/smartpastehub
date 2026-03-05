# Smart Paste Hub

A Windows desktop clipboard manager built with Electron + React + TypeScript. Automatically cleans, formats, and transforms clipboard content when you paste, with smart context awareness that adapts behavior based on which app you copied from and which app you're pasting into.

## Features

- **Auto-clean on paste**, triggered by global hotkey (`Alt+Shift+V` by default), runs silently in the background
- **Smart context rules**, detects copy source and paste target app, applies the right preset automatically (e.g. code from VS Code → terminal stays as-is, email from Outlook → strips quoted replies)
- **20+ content types detected**, plain text, source code, JSON/YAML/TOML, HTML, CSV/TSV tables, email, PDF text, URLs, phone numbers, addresses, and more
- **Unicode safety net**, fixes mojibake, NBSP, smart quotes, zero-width characters, soft hyphens, CRLF, and fullwidth ASCII on every paste
- **Email cleaner**, strips quoted reply headers, trailing newsletter footers, and collapses excessive blank lines
- **Code passthrough**, source code and structured data (JSON, YAML, TOML) are never whitespace-normalized
- **AI rewrite**, fix grammar, rephrase, formalize, summarize, translate, bullet list, and more (requires API key)
- **OCR**, screenshot-to-text via global hotkey
- **Multi-copy**, collect multiple clipboard items and merge them
- **Paste queue**, enqueue multiple items, paste them one at a time
- **Clipboard ring**, browse recent clipboard history
- **Security scanner**, detect and mask PII (API keys, emails, phone numbers, etc.) with "Mask & Paste" protection (gated by settings)
- **Plugin runtime (internal)**, core plugin runtime registers built-in plugins at startup; public plugin marketplace/UI is still planned
- **HUD toasts**, non-intrusive floating notifications show what was applied on each paste

## How It Works

```
Copy text from any app
        ↓
Global hotkey (Alt+Shift+V) triggers paste flow
        ↓
Context rule matched? → apply preset override (e.g. codePassthrough)
        ↓
Pipeline runs 20+ middlewares in order:
  1. unicode-cleaner      (always, fixes encoding issues)
  2. html-stripper        (if HTML clipboard data present)
  3. line-break-fixer     (PDF-style wrapped lines)
  4. code-indent-fixer    (fixes mixed indentation)
  5. table-converter      (CSV / TSV / HTML table → Markdown)
  6. json-formatter       (pretty-prints JSON/YAML/TOML)
  7. email-cleaner        (strips quoted replies and junk)
  8. url-cleaner          (strips tracking params)
  9. phone-normalizer     (standardizes formats)
  10. timestamp-converter (normalizes date/time)
  11. path-converter      (Win↔Unix path conversion)
  12. color-converter     (normalizes CSS/HEX/RGB)
  13. math-evaluator      (appends calculation results)
  14. markdown-cleaner    (fixes MD syntax issues)
  15. base64-codec        (decodes base64 content)
  16. duplicate-line-remover (collapses identical lines)
  17. whitespace-normalizer (collapses extra spaces, skipped for code/data)
  18. symbol-stripper     (removes non-printable chars)
  19. regex-transformer   (opt-in per-call find/replace)
  20. ai-rewriter         (opt-in per-call AI features)

Utility middlewares (opt-in only):
  - sensitive-masker, slug-generator, list-sorter, case-converter, number-formatter
        ↓
Cleaned text auto-pasted into target app
HUD toast shows what was applied
```

## Getting Started

```bash
npm install
npm run dev:desktop
```

To run each process manually:

```bash
npm run dev:renderer -- --host 127.0.0.1 --port 5173 --strictPort
npm run dev:main
npm run dev:electron
```

## Build Installer

```bash
# Build renderer + main, then package Windows NSIS installer + portable exe
npm run build && npm run package:win
# Output: release/SmartPasteHub-0.1.0-x64.exe
```

## Quality Checks

```bash
npm run typecheck      # TypeScript — main + renderer (0 errors)
npm run test           # Vitest unit tests (current suite)
npm run test:e2e       # Playwright E2E smoke tests (5 tests)
npm run build          # Production build
npm run lint           # ESLint
```

## Key Paths

```
src/
├── main/
│   ├── index.ts                     # Main process — hotkey, clipboard watcher, paste flow
│   ├── hud-manager.ts               # Floating HUD toast window
│   ├── ipc/                         # IPC handlers (clipboard, AI, OCR, security, history…)
│   └── repositories/                # SQLite repositories (history, context rules, snippets)
├── core/
│   ├── cleaner.ts                   # Top-level cleanContent() entry point
│   ├── content-detector.ts          # Detects 20+ content types from text/HTML
│   ├── context-rules.ts             # Smart context rules + DEFAULT_RULES
│   ├── presets.ts                   # Clean presets (default, codePassthrough, emailClean…)
│   ├── unicode-cleaner.ts           # Unicode sanitizer (mojibake, NBSP, smart quotes…)
│   ├── email-cleaner.ts             # Email reply/footer stripper
│   └── pipeline/
│       ├── default-pipeline.ts      # Ordered middleware stack
│       ├── pipeline-runner.ts       # Runs middlewares, tracks appliedTransforms
│       └── middlewares/             # Individual middleware modules
├── renderer/
│   ├── App.tsx                      # App shell + tab routing
│   ├── pages/                       # SmartPastePage, HistoryPage, SettingsPage, DashboardPage
│   └── components/                  # SmartPasteZone, ResultPanel, Toast, AppSidebar…
├── plugins/
│   ├── plugin-api.ts                # SmartPastePlugin interface
│   ├── plugin-runtime.ts            # Hook registration + transform middleware bridge
│   └── builtin/                     # Built-in plugins (zero-width-cleaner)
└── security/
    ├── sensitive-detector.ts        # PII pattern detection
    ├── context-guard.ts             # Paste context safety checks
    └── data-masker.ts               # Full / partial masking
```

## Plugin Status

- Runtime + built-in plugin hooks are implemented in `src/plugins/`.
- Public plugin catalog/installation UI is not yet released (currently marked planned in-app).
- Treat plugin extensibility as developer/internal capability for now.

## Default Hotkeys

| Hotkey              | Action                                             |
| ------------------- | -------------------------------------------------- |
| `Alt+Shift+V`       | Smart paste (clean + paste)                        |
| `Ctrl+Alt+H`        | Open history ring                                  |
| `Ctrl+Alt+S`        | OCR screenshot → clipboard                         |
| `Shift+PrintScreen` | OCR screenshot → clipboard                         |
| `Ctrl+Alt+C`        | Start multi-copy collection                        |
| `Ctrl+Alt+G`        | Ghost write (type cleaned text into active window) |
| `Ctrl+Alt+T`        | Translate clipboard                                |

All hotkeys are configurable in Settings.

## Smart Context Rules (Default)

| Rule                     | Copy source                    | Paste target                        | Preset applied    |
| ------------------------ | ------------------------------ | ----------------------------------- | ----------------- |
| `to-terminal-code`       | any                            | `WindowsTerminal.exe` + source_code | `codePassthrough` |
| `to-terminal-json`       | any                            | `WindowsTerminal.exe` + json_data   | `codePassthrough` |
| `from-outlook-email`     | `OUTLOOK.EXE` + email_text     | any                                 | `emailClean`      |
| `from-thunderbird-email` | `thunderbird.exe` + email_text | any                                 | `emailClean`      |

Custom rules are applied automatically based on context. Rules can be added and managed in Settings -> Context Rules (or via direct configuration/API).

## IPC Architecture

All renderer → main communication goes through `invokeIPC()` from `src/renderer/lib/ipc.ts`, guarded by `hasSmartPasteBridge()`. Never call `window.smartpaste.invoke()` directly.

Main process registers all IPC handlers in `src/main/ipc/index.ts` using a `safeHandle()` wrapper that logs errors and returns structured responses.

## Open Source Standards

- License: `LICENSE`
- Contribution guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Security policy: `SECURITY.md`
- Support channels: `SUPPORT.md`
- Community templates: `.github/ISSUE_TEMPLATE/` (templates may be added in future releases)
- Security automation: CodeQL, dependency review, and Dependabot workflows

## History & Security

- **History Pruning**, automatically enforces `maxItems` and `retentionDays` settings (pinned items are preserved).
- **Security Scanner**, gated by `settings.security.detectSensitive`. When PII is detected, the user is prompted with three options: **Paste**, **Mask & Paste**, or **Cancel**.
- **Plugin Status**, Built-in plugins are registered at startup. The runtime is currently internal-only.

## Security Notes
