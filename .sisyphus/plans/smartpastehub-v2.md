# SmartPasteHub V2: Comprehensive Improvement Plan

This roadmap bridges the gap between the current "functional skeleton" and the ambitious all-in-one clipboard intelligence product described in the `docs/` specification. It addresses accumulated technical debt, connects orphaned UI components, implements missing backend logic, and sets the stage for a production release.

## Phase 1: Foundation & Security Hardening (P0)

**Goal:** Address critical vulnerabilities, stabilize the core IPC boundary, and fix high-visibility UI bugs before adding new features.

1. **Security - Content Security Policy (CSP):**
   - Add a strict CSP meta tag to `src/renderer/index.html`.
   - Ensure `script-src` and `style-src` are properly locked down (no `unsafe-inline` if possible, though React/Vite might need specific hashes/nonces in dev).
2. **Stability - IPC Error Boundary:**
   - Wrap all handlers in `src/main/ipc-handlers.ts` with `try/catch` blocks.
   - Standardize error responses returning the `IPCFailure` type (from `src/shared/ipc-response.ts`) so the renderer doesn't crash on unhandled promise rejections (e.g., if SQLite fails).
3. **Data Integrity - SQLite Migrations:**
   - Update `src/main/db.ts` to include a simple version-based migration system (e.g., a `schema_version` table) instead of relying solely on `CREATE TABLE IF NOT EXISTS`.
4. **UX Bug - Theme Switching:**
   - Fix the dark mode logic in `src/renderer/pages/SettingsPage.tsx` which currently conflicts with `variables.css`. Ensure `data-theme="dark"` is correctly applied to the `<html>` element and persists.
5. **UX Bug - Focus Trap & Accessibility:**
   - Implement focus trapping for modal components and full keyboard navigation for the History list (arrow keys to select, enter to paste), as defined in `docs/13-accessibility.md`.

## Phase 2: UI Integration & Feature Unblocking (P1)

**Goal:** Connect existing "orphaned" UI prototypes to the main process and make them functional, completing the core user experience.

1. **Route Expansion:**
   - Add missing routes to `src/renderer/App.tsx` and the Sidebar for: `SnippetsPage`, `TemplatesPage`, `AISettingsPage`, `SyncPage`, and `PluginsPage`.
2. **Activate Dead Converters:**
   - Integrate `syntax-highlighter`, `markdown-richtext`, and `json-yaml-toml` from `src/converter/` into the core pipeline (`src/core/cleaner.ts`) or expose them via dedicated IPC handlers so they can be invoked manually from the UI.
3. **Connect Floating Windows:**
   - Implement window management in `src/main/` to spawn the 5 orphaned windows: `AutoChart`, `WebClipper`, `QRBridge`, `DragDropZone`, and `PasteHistoryRing`.
   - Add the corresponding IPC handlers (`chart:generate`, `clipper:clip-url`, `qr:generate`, etc.) to `ipc-handlers.ts`.
4. **Snippets & Templates Backend:**
   - Ensure the template engine (`src/productivity/template-engine.ts`) is fully wired up to the UI so users can create, save, and use templates with variable substitution.

## Phase 3: Advanced Module Implementation (P2)

**Goal:** Replace scaffolded stubs with real implementations for the application's unique selling points (OCR, AI, Productivity).

1. **OCR Engine Integration:**
   - Replace the stub in `src/ocr/ocr-engine.ts` with actual `tesseract.js` logic.
   - Implement the `screen-capture.ts` module to allow users to select a screen region (Ctrl+Alt+S), capture it, run OCR, and send the cleaned text to the clipboard.
2. **AI Engine Integration:**
   - Replace the naive `format-detector.ts` and stubbed `ai-rewriter.ts` with actual local AI logic (e.g., Ollama or ONNX Runtime for format detection, and OpenAI/Gemini API integration as an option for rewriting).
3. **Productivity Power Tools:**
   - Implement the `multi-clipboard` and `paste-queue` logic. Allow users to enter a mode where copied items are queued and pasted sequentially or merged.

## Phase 4: Platform Expansion & Sync (P3)

**Goal:** Extend the application beyond the desktop boundaries.

1. **Browser Extension Bridge:**
   - Finalize the Chrome/Firefox extension in the `extension/` folder using Manifest V3.
   - Ensure Native Messaging is correctly configured to communicate with the Electron main process for seamless web-to-desktop clipboard handoffs.
2. **Cross-Device Sync:**
   - Replace the `sync-manager.ts` stub with actual WebSocket-based syncing logic using the existing Cloudflare Worker relay and AES-256-GCM encryption modules.
3. **Auto-Updater:**
   - Configure `electron-updater` in the main process to allow for seamless background updates.

## Phase 5: Polish, Performance & QA (P4)

**Goal:** Prepare for a robust, production-ready release.

1. **Test Coverage Expansion:**
   - Write deep unit tests for `src/core/cleaner.ts` (the heart of the app) covering complex edge cases like nested HTML tables, weird PDF line breaks, and mixed formatting.
   - Add integration tests for the IPC boundary.
2. **Bundle & Startup Optimization:**
   - Implement `React.lazy()` and `Suspense` in `App.tsx` for route-based code splitting.
   - Use `manualChunks` in `vite.config.ts` to separate React/vendor code from application code.
   - Dynamically import heavy converters (e.g., `highlight.js`, `js-yaml`) only when needed.
3. **Onboarding Flow:**
   - Create a first-run welcome screen that guides users through setting up hotkeys, selecting a default preset, and understanding the core value proposition.

---

_Generated by Prometheus based on gap analysis between docs/ vision and current functional skeleton._
