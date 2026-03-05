## 2026-02-27 Task: icon-audit

### Icon Files Available

- `logo.png` (1024x1024, root) — professional teal checkmark on grey document with sparkles
- `assets/tray/icon.png` (1024x1024) — same design as logo.png
- `assets/icons/icon.ico` — Windows icon (used by electron-builder for exe embedding)
- `assets/icons/icon.icns` — macOS icon
- `build/icon.ico` — duplicate of assets/icons/icon.ico (for dev context menu)
- `src/renderer/assets/app-logo.png` (1024x1024) — same design, used in AppSidebar.tsx

### electron-builder Behavior

- `buildResources: assets` means assets/ is used at BUILD TIME only
- `'!assets{,/**/*}'` — assets directory is EXCLUDED from the asar bundle
- `logo.png` IS bundled inside asar (via `files: [logo.png]` in electron-builder.yml)
- `extraResources` only has tessdata, NOT icons

### \_\_dirname Resolution in Packaged Build

- Main process files compile to `dist/main/main/*.js`
- In packaged app, `__dirname` = `app.asar/dist/main/main/`
- `path.join(__dirname, "../../assets/tray/icon.png")` → `app.asar/dist/assets/tray/icon.png` — DOES NOT EXIST
- `path.join(app.getAppPath(), "logo.png")` → `app.asar/logo.png` — EXISTS AND WORKS

### Three Different resolveAppIconPath() Functions

1. `index.ts:366` — uses `app.getAppPath()` + logo.png — WORKS in packaged
2. `hud-manager.ts:39` — uses \_\_dirname-based paths — FAILS in packaged
3. `tray-manager.ts` — uses \_\_dirname-based paths — FAILS in packaged

### Windows Tray Icon Requirements

- Windows tray icons should be .ico for best quality at small sizes
- nativeImage can load .png but .ico gives better multi-resolution support
- Tray icons are typically 16x16 or 32x32

### context-menu.ts Icon

- Uses process.execPath when packaged (Windows extracts icon from exe) — works fine
- Uses build/icon.ico or assets/icons/icon.ico in dev — works fine
