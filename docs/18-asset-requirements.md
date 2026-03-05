# Asset Requirements

Dokumen ini merangkum aset yang dibutuhkan Smart Paste Hub untuk runtime, packaging, dan release.

## 1) Core App Branding Assets

| Asset     | Path                               | Kegunaan                            | Status |
| --------- | ---------------------------------- | ----------------------------------- | ------ |
| Main logo | `src/renderer/assets/app-logo.png` | Logo utama di UI renderer           | ✅ ada |
| Root logo | `logo.png`                         | Disertakan saat packaging (`files`) | ✅ ada |

## 2) Desktop Packaging Icons

Sumber konfigurasi: `electron-builder.yml`.

| Platform | Asset            | Path                     | Status |
| -------- | ---------------- | ------------------------ | ------ |
| Windows  | App icon         | `assets/icons/icon.ico`  | ✅ ada |
| Windows  | Installer icon   | `assets/icons/icon.ico`  | ✅ ada |
| Windows  | Uninstaller icon | `assets/icons/icon.ico`  | ✅ ada |
| macOS    | App icon         | `assets/icons/icon.icns` | ✅ ada |
| Linux    | Icon directory   | `assets/icons/`          | ✅ ada |
| Tray     | Tray icon        | `assets/tray/icon.png`   | ✅ ada |

## 3) OCR Runtime Assets

Konfigurasi di `extraResources` (`electron-builder.yml`).

| Asset            | Path              | Kegunaan             | Status |
| ---------------- | ----------------- | -------------------- | ------ |
| English model    | `eng.traineddata` | OCR bahasa Inggris   | ✅ ada |
| Indonesian model | `ind.traineddata` | OCR bahasa Indonesia | ✅ ada |

## 4) Packaging/Signing Support Assets

| Asset                    | Path                           | Kegunaan                            | Status                        |
| ------------------------ | ------------------------------ | ----------------------------------- | ----------------------------- |
| macOS entitlements plist | `build/entitlements.mac.plist` | Hardened runtime/notarization macOS | ⚠️ belum ada di repo saat ini |

## 5) Release Infrastructure Assets (External, bukan file repo)

| Asset                                     | Kegunaan                                                                       | Status default                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| Code signing certificate (Windows)        | Signed installer/exe (`package:win:signed`)                                    | ❌ harus disediakan di CI/local secure store       |
| Apple Developer cert + notarization creds | Build dan notarize macOS                                                       | ❌ harus disediakan di CI/local secure store       |
| Auto-update feed URL                      | Distribusi update (provider generic/github)                                    | ⚠️ `https://example.com/updates` masih placeholder |
| Telemetry endpoint + key                  | Observability runtime (`SMARTPASTE_TELEMETRY_URL`, `SMARTPASTE_TELEMETRY_KEY`) | ⚠️ optional, belum wajib untuk local               |

## 6) Minimum Asset Checklist sebelum Release Publik

1. Pastikan `assets/icons/icon.ico` dan `assets/icons/icon.icns` final brand (bukan sementara).
2. Tambahkan `build/entitlements.mac.plist` jika target macOS release aktif.
3. Ganti URL update placeholder di `electron-builder.yml` ke endpoint production.
4. Siapkan signing credentials di pipeline CI release.
5. Verifikasi OCR models (`eng.traineddata`, `ind.traineddata`) ikut terbundle di hasil installer.
