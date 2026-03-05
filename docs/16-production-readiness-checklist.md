# 16 — Production Readiness Checklist v1

## 16.1 Tujuan

Dokumen ini adalah checklist eksekusi untuk membawa SmartPasteHub ke kondisi production-ready.
Fokusnya bukan tambah fitur, tapi stabilitas, keamanan, distribusi, observability, dan operasi release.

## 16.2 Baseline Saat Ini (2026-02-28)

- Build pipeline lokal lulus: `typecheck`, `vitest`, `build`
- Fitur inti berjalan (paste flow, OCR, history, telemetry anonim)
- Packaging Windows sudah tersedia
- Masih perlu hardening untuk release publik skala luas

### Evidence Langsung dari Source Code

| Area                                | Status Saat Ini                | Evidence                                                                           |
| ----------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| CI minimum (typecheck/test/build)   | ✅ Ada                         | `.github/workflows/ci.yml`                                                         |
| Packaging release gate di CI        | ⚠️ Belum ada di CI             | `.github/workflows/ci.yml`, `package.json`                                         |
| E2E di CI                           | ⚠️ Belum dijalankan di CI      | `.github/workflows/ci.yml`, `package.json`                                         |
| Code signing Windows                | ❌ Disable                     | `electron-builder.yml` (`signAndEditExecutable: false`, `forceCodeSigning: false`) |
| Auto updater                        | ✅ Aktif                       | `src/main/auto-updater.ts`                                                         |
| Staged rollout updater              | ❌ Belum ada                   | `src/main/auto-updater.ts`                                                         |
| IPC allowlist (renderer->main)      | ✅ Ada                         | `src/main/preload.ts`                                                              |
| Payload schema validation terpusat  | ❌ Belum ada                   | `src/main/ipc/safe-handle.ts` (payload `unknown`, tanpa schema)                    |
| Enkripsi API key                    | ✅ Ada, bergantung safeStorage | `src/main/settings-store.ts`                                                       |
| Migrasi otomatis plaintext key lama | ⚠️ Belum eksplisit             | `src/main/settings-store.ts`                                                       |
| Telemetry anon                      | ✅ Ada                         | `src/main/telemetry.ts`                                                            |
| Telemetry default opt-in            | ⚠️ Default ON                  | `src/shared/constants.ts` (`observabilityEnabled: true`)                           |
| Crash reporting eksternal           | ❌ Belum ada                   | `src/main/index.ts` (hanya logger lokal)                                           |

## 16.3 Milestone Plan (P0 / P1 / P2)

| Milestone                  | Scope                                                | Owner Utama                  | Deadline   | Exit Criteria                      |
| -------------------------- | ---------------------------------------------------- | ---------------------------- | ---------- | ---------------------------------- |
| P0 - Launch Blockers       | Security, signing, release gate, update safety       | Release Lead + Security Lead | 2026-03-14 | Tidak ada blocker security/release |
| P1 - Reliability Hardening | Soak test, compatibility, perf budget, DB resilience | Core Engineer + QA Lead      | 2026-03-28 | Stabil lintas environment          |
| P2 - Operations Excellence | Incident runbook, support, SLA, compliance polish    | PM/Founder + Ops Lead        | 2026-04-18 | Operasi rilis berulang siap        |

## 16.4 P0 - Launch Blockers (Wajib sebelum rilis publik)

### Security and Secrets

- [ ] Rotate semua API key yang pernah terekspos di environment lokal/dev
  - Owner: Security Lead
  - Deadline: 2026-03-02
  - DoD: key lama invalid, key baru aktif, bukti rotasi tercatat
- [ ] Paksa penyimpanan kredensial sensitif terenkripsi (OS-backed encryption)
  - Owner: Core Engineer
  - Deadline: 2026-03-04
  - DoD: tidak ada plaintext key di config runtime baru
- [ ] Tambahkan secret scanning di CI (prevent commit key)
  - Owner: Release Lead
  - Deadline: 2026-03-04
  - DoD: pipeline gagal otomatis jika ada secret pattern

### Release Trust and Distribution

- [ ] Code-signing installer dan executable Windows
  - Owner: Release Lead
  - Deadline: 2026-03-07
  - DoD: installer signed dan verifikasi signature valid
- [ ] CI release gate wajib: typecheck + test + build + package:win
  - Owner: Release Lead
  - Deadline: 2026-03-06
  - DoD: artifact release hanya keluar jika semua gate pass
- [ ] Auto-update staged rollout + rollback playbook
  - Owner: Release Lead
  - Deadline: 2026-03-10
  - DoD: 5% -> 25% -> 100% rollout policy terdokumentasi dan bisa dieksekusi

### Runtime Hardening

- [ ] Validasi payload IPC berbasis schema untuk channel kritis
  - Owner: Core Engineer
  - Deadline: 2026-03-12
  - DoD: channel kritis reject payload invalid dan ada test coverage
- [ ] Crash reporting + startup recovery minimum (safe mode path)
  - Owner: Core Engineer
  - Deadline: 2026-03-12
  - DoD: crash event terkoleksi, app tetap bisa restart ke mode aman

### Privacy and Telemetry

- [ ] Publish privacy note: data dikirim vs tidak dikirim
  - Owner: PM/Founder
  - Deadline: 2026-03-08
  - DoD: halaman privacy dan in-app disclosure tersedia
- [ ] Verifikasi telemetry anonim (tanpa identitas personal)
  - Owner: Security Lead
  - Deadline: 2026-03-08
  - DoD: audit field telemetry lulus, tidak ada PII tersimpan

## 16.5 P1 - Reliability Hardening

### Stability and Compatibility

- [ ] Soak test 24-48 jam (clipboard watcher, hotkey, OCR, HUD)
  - Owner: QA Lead
  - Deadline: 2026-03-18
  - DoD: tidak ada memory leak kritis, tidak ada crash blocker
- [ ] Compatibility matrix Windows 10/11 + app target utama
  - Owner: QA Lead
  - Deadline: 2026-03-21
  - DoD: test matrix terdokumentasi dengan hasil pass/fail
- [ ] Keyboard/hotkey conflict matrix (termasuk PrintScreen paths)
  - Owner: Core Engineer
  - Deadline: 2026-03-21
  - DoD: fallback hotkey tervalidasi dan terdokumentasi

### Performance and Data Integrity

- [ ] Tetapkan performance budget (startup, paste latency, OCR latency, memory)
  - Owner: Core Engineer
  - Deadline: 2026-03-16
  - DoD: threshold angka jelas + alarm saat regress
- [ ] Tambah dashboard observability minimum
  - Owner: Ops Lead
  - Deadline: 2026-03-22
  - DoD: bisa baca error rate, OCR success, fallback usage, update success
- [ ] Uji backup/restore settings + history dan migration antar versi
  - Owner: Core Engineer
  - Deadline: 2026-03-25
  - DoD: backup/restore lulus pada minimal 2 skenario upgrade

## 16.6 P2 - Operations Excellence

### Process and Incident Readiness

- [ ] Threat model formal (abuse case IPC, clipboard poisoning, scraping misuse)
  - Owner: Security Lead
  - Deadline: 2026-04-05
  - DoD: threat register + mitigasi prioritas tersedia
- [ ] Incident runbook (release failure, update failure, telemetry outage)
  - Owner: Ops Lead
  - Deadline: 2026-04-08
  - DoD: on-call bisa eksekusi runbook tanpa knowledge transfer tambahan
- [ ] Support package (bug template, crash bundle format, SLA response)
  - Owner: PM/Founder
  - Deadline: 2026-04-12
  - DoD: SOP support aktif + template publik tersedia

## 16.7 Go/No-Go Gate (Production)

Gunakan checklist ini saat keputusan release:

- [ ] 0 blocker security open
- [ ] 0 known crash repro pada smoke suite
- [ ] CI release gate 100% pass
- [ ] Installer signed dan lolos install di mesin bersih
- [ ] Auto-update staged rollout tervalidasi
- [ ] Privacy disclosure dipublish
- [ ] Rollback release teruji minimal sekali

Jika salah satu item di atas gagal, status release = NO-GO.

## 16.8 Copy-Paste Template untuk GitHub Milestones

### Milestone 1

- Title: `P0 - Launch Blockers`
- Due date: `2026-03-14`
- Description:

```text
Tujuan: menutup semua blocker sebelum rilis publik.

Scope wajib:
- Secret rotation + encrypted credential storage
- Code signing Windows
- CI release gate (typecheck/test/build/package)
- Staged auto-update + rollback
- IPC schema validation (critical channels)
- Crash reporting + safe mode path
- Privacy disclosure + telemetry anonim verification

Exit criteria:
- 0 blocker security/release
- Release artifact signed dan terverifikasi
```

### Milestone 2

- Title: `P1 - Reliability Hardening`
- Due date: `2026-03-28`
- Description:

```text
Tujuan: memastikan stabil lintas environment sebelum scale-out.

Scope wajib:
- Soak test 24-48 jam
- Compatibility matrix Win10/11 + app targets
- Hotkey conflict matrix (termasuk PrintScreen)
- Performance budget + observability dashboard
- Backup/restore + migration tests

Exit criteria:
- Tidak ada crash blocker pada soak test
- Semua skenario compatibility high-priority clear
```

### Milestone 3

- Title: `P2 - Operations Excellence`
- Due date: `2026-04-18`
- Description:

```text
Tujuan: operation-ready untuk rilis berulang dan handling incident.

Scope wajib:
- Formal threat model
- Incident runbook
- Support SOP + SLA

Exit criteria:
- On-call readiness tervalidasi
- Proses support dapat dieksekusi end-to-end
```

## 16.9 Rekomendasi Cadence Eksekusi

- Weekly checkpoint: Senin (progress), Kamis (risk review)
- Daily 15 menit: blocker and owner alignment
- Release readiness review: H-3 dari due date tiap milestone

---

Dokumen terkait:

- `docs/07-security-privacy.md`
- `docs/08-deployment.md`
- `docs/09-testing-strategy.md`
