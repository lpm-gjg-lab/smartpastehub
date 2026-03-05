## 2026-02-27 Task: icon-fix-plan

### Decision: Centralize icon resolution

- Create ONE shared utility function for icon path resolution
- All three files (index.ts, hud-manager.ts, tray-manager.ts) will import from it
- Use `app.getAppPath()` as primary resolution (works in packaged)
- Use \_\_dirname fallback for dev mode compatibility
- For Windows tray: bundle icon.ico via extraResources for best quality

### Decision: Bundle tray icon via extraResources

- Add `assets/icons/icon.ico` to extraResources in electron-builder.yml
- Use .ico for Windows tray (better multi-res support at 16x16/32x32)
- Fall back to logo.png if .ico not found

### Decision: Remove icon-active.png references

- The file doesn't exist and was never created
- Tray active state falls back to resize anyway
- Clean up dead code path or keep as non-critical fallback
