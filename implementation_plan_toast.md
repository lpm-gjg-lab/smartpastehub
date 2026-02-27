# Implementation Plan: Toast & Popup UX + Accessibility Overhaul

Gabungan temuan dari [UX Audit](file:///C:/Users/USER/.gemini/antigravity/brain/50bba736-8b0b-4eb5-8bbc-36732c54e64d/toast_ux_audit.md) dan [Accessibility Audit](file:///C:/Users/USER/.gemini/antigravity/brain/50bba736-8b0b-4eb5-8bbc-36732c54e64d/accessibility_audit.md) menjadi rencana implementasi bertahap.

---

## Phase 1: Accessibility Fixes (Prioritas Tertinggi)

Perbaikan akses keyboard, ARIA, dan focus management pada komponen yang skor aksesibilitasnya 0%.

---

### FloatingWindowShell

#### [MODIFY] [FloatingWindowShell.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/FloatingWindowShell.tsx)

Tambahkan aksesibilitas dialog penuh:

```diff
-<div style={{...}}>
+<div role="dialog" aria-modal="true" aria-labelledby="floating-title" style={{...}}
+     onKeyDown={(e) => { if (e.key === 'Escape') window.close(); }}
+     ref={dialogRef}>
```

Perubahan detail:
- Tambah `role="dialog"` dan `aria-modal="true"` pada container utama
- Tambah `aria-labelledby="floating-title"` yang terhubung ke `<span id="floating-title">`
- Tambah `onKeyDown` handler untuk **Escape key** → menutup window
- Tambah `aria-label="Close window"` pada tombol close "✕"
- Tambah **Focus Trap**: saat komponen mount, fokus terjebak di dalam dialog
- Tambah `useEffect` untuk auto-focus elemen pertama saat mount

---

### ToastApp (Floating Toast Window)

#### [MODIFY] [ToastApp.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/ToastApp.tsx)

Tambahkan semantik notifikasi:

```diff
-<div className={styles.toastContainer}>
-  <div className={`${styles.toastBox} ${closing ? styles.closing : ''}`}>
+<div className={styles.toastContainer} role="alert" aria-live="assertive" aria-atomic="true">
+  <div className={`${styles.toastBox} ${closing ? styles.closing : ''}`}
+       onKeyDown={(e) => { if (e.key === 'Escape') hideWindow(); }}
+       tabIndex={0} ref={toastRef}>
```

Perubahan detail:
- Tambah `role="alert"` dan `aria-live="assertive"` pada container
- Tambah `tabIndex={0}` agar bisa menerima keyboard focus
- Tambah `onKeyDown` untuk Escape → dismiss toast
- Tambah `useEffect` untuk auto-focus saat data baru masuk

---

### Onboarding Modal

#### [MODIFY] [Onboarding.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/Onboarding.tsx)

Ubah menjadi dialog yang aksesibel:

```diff
-<div style={{position: 'fixed', ...}}>
+<div role="dialog" aria-modal="true" aria-labelledby="onboard-title"
+     style={{position: 'fixed', ...}}
+     onKeyDown={(e) => { if (e.key === 'Escape') onComplete(); }}>
```

Perubahan detail:
- Tambah `role="dialog"` dan `aria-modal="true"` pada overlay
- Tambah `aria-labelledby="onboard-title"` pada dialog, `id="onboard-title"` pada `<h2>`
- Tombol "Get Started" → `autoFocus={true}` dan `aria-label="Mulai menggunakan Smart Paste Hub"`
- Tambah Escape key handler → panggil `onComplete()`

---

### Toast.tsx (Close Buttons)

#### [MODIFY] [Toast.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/Toast.tsx)

Perbaikan minor:

- Pastikan close button sudah Ada `aria-label` (sudah ada, verifikasi konsistensi)
- Tambah `tabIndex={0}` pada setiap toast item agar bisa di-navigate via Tab
- Tambah `onKeyDown` pada toast: Enter/Space → fokus action button, Escape → dismiss

---

### Screen Reader Announcer

#### [MODIFY] [App.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/App.tsx)

Wire up `#sr-announcer` yang sudah ada tapi belum digunakan:

```diff
+const announce = (message: string) => {
+  const el = document.getElementById('sr-announcer');
+  if (el) { el.textContent = ''; requestAnimationFrame(() => { el.textContent = message; }); }
+};
```

Call `announce()` di setiap IPC listener: `clipboard:content` → "Content copied", `clipboard:cleaned` → "Clipboard cleaned", `security:alert` → "Warning: sensitive data detected"

---

## Phase 2: Toast UX Improvements

Mengatasi masalah UX yang ditemukan di audit.

---

### Eliminasi Triple Notification

#### [MODIFY] [index.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts)

Hapus **OS Notification** (`new Notification(...)`) dari [wireClipboardWatcher](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts#70-80) karena Floating Toast sudah menangani notifikasi. Hanya pertahankan pengiriman IPC event ke renderer.

```diff
 watcher.on("change", (payload) => {
   win.webContents.send("clipboard:content", payload);
-  new Notification({ title: 'Copied to Clipboard', body: 'Content ready...' }).show();
 });
```

Dan di [setupHotkeys](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts#81-140):

```diff
-  new Notification({ title: 'Clipboard Cleaned', body: '...' }).show();
```

> [!IMPORTANT]
> Pastikan Floating Toast sudah berfungsi dengan benar sebelum menghapus OS Notification sebagai fallback.

---

### Toast Stacking Limit

#### [MODIFY] [useToastStore.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/stores/useToastStore.ts)

Tambahkan limit maksimum 3 toast visible:

```diff
 addToast: (toast) => {
   const id = Math.random().toString(36).substring(2, 9);
-  set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
+  set((state) => {
+    const updated = [...state.toasts, { ...toast, id }];
+    // Keep only latest 3 toasts
+    return { toasts: updated.slice(-3) };
+  });
```

---

### Undo Action pada Delete

#### [MODIFY] [HistoryPage.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/pages/HistoryPage.tsx)

Tambah soft-delete dengan undo window:

```diff
 addToast({
   title: "Deleted",
   message: `${ids.length} item(s) removed`,
   type: "success",
+  duration: 5000,
+  action: {
+    label: "Undo",
+    onClick: async () => {
+      // Re-insert deleted items (stored temporarily in local state)
+      await restoreDeletedItems(deletedCache);
+      await loadData();
+    }
+  }
 });
```

> [!WARNING]
> Implementasi undo memerlukan caching data yang dihapus ke state sementara sebelum benar-benar dihapus dari database. Alternatif: gunakan soft-delete flag di database.

---

### Pause-on-Hover

#### [MODIFY] [useToastStore.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/stores/useToastStore.ts)

Saat ini timer menggunakan `setTimeout` yang tidak bisa dipause.

Perubahan:
- Simpan `timeoutId` per toast item
- Expose `pauseToast(id)` dan `resumeToast(id)` dari store
- Timer resume sisa waktu saat mouse leave

#### [MODIFY] [Toast.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/Toast.tsx)

```diff
+onMouseEnter={() => pauseToast(toast.id)}
+onMouseLeave={() => resumeToast(toast.id)}
+onFocus={() => pauseToast(toast.id)}
+onBlur={() => resumeToast(toast.id)}
```

---

## Phase 3: Missing Toasts

Tambahkan toast untuk fitur yang belum memiliki feedback ke user.

---

#### [MODIFY] [App.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/App.tsx)

Tambah IPC listeners baru:

| IPC Channel | Toast Title | Toast Type |
|---|---|---|
| `clipboard:auto-cleared` | "Clipboard Auto-Cleared" | info |
| `sync:connected` | "Sync Connected" | success |
| `sync:disconnected` | "Sync Disconnected" | warning |
| `sync:received` | "Clipboard from [device]" | info |

#### [MODIFY] [index.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts)

Emit events baru dari backend:
- Setelah [scheduleClipboardClear()](file:///c:/Users/USER/Downloads/smartpastehub/src/security/auto-clear.ts#3-8) timer selesai → emit `clipboard:auto-cleared`
- Di [sync-manager.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/sync/sync-manager.ts) saat [onOpen](file:///c:/Users/USER/Downloads/smartpastehub/src/sync/sync-manager.ts#67-70) → emit `sync:connected`
- Di [sync-manager.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/sync/sync-manager.ts) saat [onClose](file:///c:/Users/USER/Downloads/smartpastehub/src/sync/sync-manager.ts#70-73) → emit `sync:disconnected`
- Di [sync-manager.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/sync/sync-manager.ts) saat `onIncomingClipboard` → emit `sync:received`

#### [MODIFY] [SmartPastePage.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/pages/SmartPastePage.tsx)

Tambah toast untuk operasi AI:

```diff
+addToast({ title: "AI Rewrite Complete", message: "Text has been rewritten", type: "success" });
```

---

## Phase 4: ToastActionBar Polish

Meningkatkan aksesibilitas tombol quick-action di floating toast.

---

#### [MODIFY] [ToastActionBar.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastActionBar.tsx)

Untuk setiap `<button>`:

```diff
-<button className={styles.actionBtn} onClick={() => onAction('calculate')} disabled={isAiLoading}>
-  🧮 Calculate
+<button className={styles.actionBtn} onClick={() => onAction('calculate')} disabled={isAiLoading}
+        aria-label="Calculate mathematical expression"
+        aria-busy={isAiLoading}>
+  🧮 Calculate
```

Tambah juga keyboard shortcuts:

```diff
+useEffect(() => {
+  const handler = (e: KeyboardEvent) => {
+    if (e.key >= '1' && e.key <= '9') {
+      const buttons = document.querySelectorAll('[data-action-index]');
+      const btn = buttons[parseInt(e.key) - 1] as HTMLButtonElement;
+      btn?.click();
+    }
+  };
+  window.addEventListener('keydown', handler);
+  return () => window.removeEventListener('keydown', handler);
+}, []);
```

#### [MODIFY] [ToastHeader.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastHeader.tsx)

- Tambah `aria-label` deskriptif pada badge tipe konten
- Pastikan judul bisa dibaca oleh screen reader

---

## Phase 5: Reduced Motion & High Contrast

#### [MODIFY] [ToastWindow.module.css](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/styles/components/ToastWindow.module.css)

```css
@media (prefers-reduced-motion: reduce) {
  .toastBox { animation: none !important; transition: none !important; }
  .closing { animation: none !important; }
}

@media (forced-colors: active) {
  .toastBox { border: 2px solid CanvasText; }
  .actionBtn { border: 1px solid ButtonText; }
}
```

---

## Verification Plan

### Unit Tests (Vitest + jsdom)

> Command: `npx vitest run --reporter=verbose`

#### [NEW] [FloatingWindowShell.test.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/__tests__/FloatingWindowShell.test.tsx)

Test cases:
- ✅ Renders with `role="dialog"` and `aria-modal="true"`
- ✅ Close button has `aria-label="Close window"`
- ✅ Escape key fires `window.close()`
- ✅ First focusable element receives focus on mount

#### [NEW] [Onboarding.test.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/__tests__/Onboarding.test.tsx)

Test cases:
- ✅ Renders with `role="dialog"`
- ✅ "Get Started" button has focus on mount
- ✅ Escape key calls `onComplete`

#### [NEW] [useToastStore.test.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/stores/__tests__/useToastStore.test.ts)

Test cases:
- ✅ Max 3 toasts visible (stacking limit)
- ✅ Oldest toast removed when exceeding limit
- ✅ Pause/resume timer works correctly

### Manual Verification by User

> [!IMPORTANT]
> Karena toast dan popup melibatkan **jendela Electron terpisah** yang tidak bisa disimulasikan dalam jsdom, beberapa verifikasi harus dilakukan secara manual.

1. **Jalankan aplikasi** dengan `npm run dev`
2. **Copy teks apapun** di luar aplikasi → Verifikasi hanya 1 notifikasi muncul (bukan 3)
3. **Tekan Tab** saat toast muncul → Verifikasi fokus berpindah ke tombol action
4. **Tekan Escape** saat toast muncul → Verifikasi toast tertutup
5. **Buka History Popup** → Tekan **Escape** → Verifikasi popup tertutup
6. **Hover di atas toast** → Verifikasi toast tidak hilang selama mouse di atasnya
7. **Hapus item di History** → Verifikasi muncul tombol "Undo" selama 5 detik
8. **Buka app pertama kali** (hapus localStorage) → Verifikasi tombol "Get Started" sudah terfokus
