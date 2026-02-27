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

## Phase 4: Feature Accessibility via Toast/Popup

Menambahkan 4 fitur yang seharusnya bisa diakses langsung dari Floating Toast tanpa membuka jendela utama.

---

### 4.1 — "Save as Snippet" Button

Tambah tombol untuk menyimpan teks yang baru di-copy langsung sebagai snippet, tanpa buka app utama.

#### [MODIFY] [ToastActionBar.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastActionBar.tsx)

Tambah tombol "Save as Snippet" sebagai aksi universal (muncul untuk semua tipe konten):

```diff
 return (
   <div className={styles.actions}>
     {renderContextButtons()}
+    <button className={styles.actionBtn} onClick={() => onAction('save_snippet')}
+            aria-label="Save copied text as reusable snippet">
+      💾 Save Snippet
+    </button>
     <button className={styles.actionBtn} onClick={() => onAction('UPPERCASE')}>
```

#### [MODIFY] [toastActions.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/toastActions.ts)

Tambah handler baru di [runToastAction()](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/toastActions.ts#3-140):

```diff
+ } else if (action === 'save_snippet') {
+   try {
+     await api?.invoke('snippet:create', {
+       name: `Quick Save ${new Date().toLocaleTimeString()}`,
+       content: data.original,
+       category: 'quick-save',
+       tags: [data.type]
+     });
+     setData({ ...data, cleaned: '✅ Saved as Snippet!' });
+   } catch (err) {
+     console.error('Save snippet failed', err);
+     setData({ ...data, cleaned: '❌ Failed to save snippet' });
+   }
+   setCopied(true);
+   scheduleClose(1500);
+   return;
```

---

### 4.2 — Multi-Clipboard Indicator

Saat mode Multi-Copy aktif, user harus tahu berapa item yang sudah dikumpulkan.

#### [MODIFY] [ToastHeader.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastHeader.tsx)

Tambah status Multi-Clipboard di header toast:

```diff
 const getTitle = () => {
+  if (data.type === 'multi_clipboard') return `Multi-Copy: ${data.mergedCount} items collected`;
   if (data.type === 'bypass_mode') return 'Auto-Clean Snoozed';
```

#### [MODIFY] [index.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts)

Di [wireClipboardWatcher](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts#70-80), saat multi-clipboard aktif, kirim data tambahan:

```diff
 watcher.on("change", (payload) => {
+  const multiState = getMultiClipboard();
+  if (multiState.isCollecting) {
+    addItem(payload.text);
+    win.webContents.send("clipboard:content", {
+      ...payload,
+      type: 'multi_clipboard',
+      mergedCount: multiState.items.length + 1,
+      maxItems: multiState.maxItems
+    });
+    return;
+  }
   win.webContents.send("clipboard:content", payload);
```

---

### 4.3 — Format Converter Buttons

Saat user meng-copy JSON, tampilkan tombol "Convert to YAML" dan sebaliknya.

#### [MODIFY] [ToastActionBar.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastActionBar.tsx)

Tambah case baru di [renderContextButtons()](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastActionBar.tsx#17-68):

```diff
+    case 'json_data':
+      return (
+        <>
+          <button className={styles.actionBtn} onClick={() => onAction('convert_yaml')}
+                  aria-label="Convert JSON to YAML format">
+            📄 → YAML
+          </button>
+          <button className={styles.actionBtn} onClick={() => onAction('convert_toml')}
+                  aria-label="Convert JSON to TOML format">
+            📄 → TOML
+          </button>
+        </>
+      );
+    case 'yaml_data':
+      return (
+        <button className={styles.actionBtn} onClick={() => onAction('convert_json')}
+                aria-label="Convert YAML to JSON format">
+          📄 → JSON
+        </button>
+      );
+    case 'toml_data':
+      return (
+        <button className={styles.actionBtn} onClick={() => onAction('convert_json')}
+                aria-label="Convert TOML to JSON format">
+          📄 → JSON
+        </button>
+      );
```

#### [MODIFY] [toastActions.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/toastActions.ts)

Tambah handler konversi:

```diff
+ } else if (action === 'convert_yaml' || action === 'convert_json' || action === 'convert_toml') {
+   const targetFormat = action.replace('convert_', '');
+   try {
+     const res = await api?.invoke('transform:convert-format', {
+       text: data.original,
+       targetFormat
+     }) as any;
+     if (res?.result) {
+       newText = res.result;
+       setData({ ...data, cleaned: newText, type: `${targetFormat}_data` });
+     }
+   } catch (err) {
+     console.error('Format conversion failed', err);
+   }
```

#### [NEW] [transform.ipc.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/main/ipc/transform.ipc.ts)

IPC handler baru untuk konversi format yang memanggil [autoConvert()](file:///c:/Users/USER/Downloads/smartpastehub/src/converter/json-yaml-toml.ts#28-33) dari [src/converter/json-yaml-toml.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/converter/json-yaml-toml.ts).

---

### 4.4 — Paste Queue Indicator

Saat Paste Queue memiliki item, toast harus menunjukkan preview item berikutnya.

#### [MODIFY] [ToastHeader.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastHeader.tsx)

```diff
 const getTitle = () => {
+  if (data.type === 'paste_queue') return `Queue: ${data.mergedCount} items pending`;
```

#### [MODIFY] [index.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts)

Saat item ditambahkan ke queue, kirim notifikasi:

```diff
+ // After enqueue operation, notify renderer
+ const queueSize = size();
+ const nextItem = peek();
+ mainWindow?.webContents.send("clipboard:content", {
+   text: nextItem ? `Next: ${nextItem.substring(0, 50)}...` : '',
+   type: 'paste_queue',
+   mergedCount: queueSize
+ });
```

---

### 4.5 — OCR Capture Popup

Karena backend [ocr-engine.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/ocr/ocr-engine.ts) masih berupa stub, fitur ini perlu diimplementasikan agar bisa dipanggil lewat popup khusus.

#### [MODIFY] [ocr-engine.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/ocr/ocr-engine.ts)

Implementasikan OCR backend menggunakan `tesseract.js` (atau API lain jika preferred):

```typescript
// Setup tesseract.js worker and implement recognizeText() properly
```

#### [NEW] [OCRPopup.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/pages/OCRPopup.tsx)

Buat React component baru khusus untuk OCR:
1. Tampilkan gambar yang dicrop (atau area snippet).
2. Tampilkan loading state saat memproses gambar.
3. Tampilkan hasil ekstraksi teks yang bisa langsung dicopy atau di-edit.

#### [MODIFY] [index.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/main/index.ts)

Register route `/ocr` agar bisa dipanggil sebagai floating window:

```typescript
// Provide a hotkey shortcut to open OCR popup
```

---

### 4.6 — Expanded AI Actions

Backend AI sudah mendukung `fix_grammar`, `rephrase`, dan `formalize`, tapi di UI Action Bar baru ada `summarize`.

#### [MODIFY] [ToastActionBar.tsx](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/ToastActionBar.tsx)

Tambah 3 tombol AI baru di default case:

```diff
     default:
       return (
         <>
           <button className={styles.actionBtn} onClick={() => onAction('make_secret')} disabled={isAiLoading} title="Create 1-time secret link">
             {isAiLoading ? 'Encrypting...' : '💣 Secret Link'}
           </button>
+          <button className={styles.actionBtn} onClick={() => onAction('fix_grammar')} disabled={isAiLoading}>
+            {isAiLoading ? '✨ Thinking...' : '✅ Fix Grammar'}
+          </button>
+          <button className={styles.actionBtn} onClick={() => onAction('rephrase')} disabled={isAiLoading}>
+            {isAiLoading ? '✨ Thinking...' : '🔄 Rephrase'}
+          </button>
+          <button className={styles.actionBtn} onClick={() => onAction('formalize')} disabled={isAiLoading}>
+            {isAiLoading ? '✨ Thinking...' : '👔 Formalize'}
+          </button>
           <button className={styles.actionBtn} onClick={() => onAction('summarize')} disabled={isAiLoading}>
             {isAiLoading ? '✨ Thinking...' : '📝 Summarize'}
           </button>
         </>
       );
```

#### [MODIFY] [toastActions.ts](file:///c:/Users/USER/Downloads/smartpastehub/src/renderer/components/toast/toastActions.ts)

Sambungkan 3 action baru ini ke handler API yang sama dengan logika summarize:

```diff
- if (action === 'summarize') {
+ if (['summarize', 'fix_grammar', 'rephrase', 'formalize'].includes(action)) {
    clearDismissTimers();
    setIsAiLoading(true);
    try {
      const res = (await api?.invoke('ai:rewrite', {
        text: data.cleaned,
-       mode: 'summarize',
+       mode: action,
      })) as any;
```

---

## Phase 5: ToastActionBar Polish


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

## Phase 6: Reduced Motion & High Contrast

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
9. **Copy JSON** → Verifikasi muncul tombol "→ YAML" dan "→ TOML" di Floating Toast
10. **Klik "Save Snippet"** di toast → Verifikasi item tersimpan di Snippets
11. **Aktifkan Multi-Copy** → Copy beberapa teks → Verifikasi counter tampil di toast
12. **Tambah item ke Queue** → Verifikasi toast menunjukkan jumlah dan preview item berikutnya
13. **Panggil OCR** → Verifikasi popup OCR muncul dan merender gambar vs teks hasil
14. **Klik "Fix Grammar"** di toast biasa → Verifikasi AI memproses teks dengan mode yang benar
