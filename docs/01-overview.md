# 01 — Overview & Visi Produk

## 1.1 Apa itu Smart Paste Hub?

**Smart Paste Hub** adalah alat clipboard formatter terpadu yang berjalan sebagai desktop agent + browser extension. Tujuan utamanya: menghilangkan semua masalah copy-paste yang dialami pengguna sehari-hari — dari format berantakan, line break pecah, tabel rusak, hingga konversi format data otomatis.

## 1.2 Problem Statement

```mermaid
mindmap
  root((Masalah Copy-Paste))
    Format Berantakan
      Font/warna ikut terbawa
      Styling tidak diinginkan
      Harus paste ke Notepad dulu
    Line Break Pecah
      PDF memotong setiap baris
      Email wrap di posisi aneh
      Google Docs line breaks
    Tabel Rusak
      Tabel dari Excel jadi teks acak
      HTML table hilang struktur
      Harus format ulang manual
    Keamanan
      Data sensitif terekspose
      Clipboard tidak di-clear
      Password tersimpan lama
    Produktivitas
      Harus copy-paste satu per satu
      Tidak ada riwayat clipboard
      Format konversi manual
```

### Pain Points Spesifik

| Skenario | Masalah | Frekuensi |
|----------|---------|-----------|
| Copy dari PDF jurnal ke Word | Setiap baris jadi paragraf baru, harus gabung manual | Sangat Sering |
| Copy dari Google Docs ke InDesign | Font, warna, ukuran ikut — "menambah jam kerja" | Sering |
| Copy tabel dari web ke Markdown editor | Tabel hilang struktur, jadi teks acak | Sering |
| Copy password dari password manager | Tersimpan di clipboard tanpa batas waktu | Berbahaya |
| Developer copy JSON, perlu YAML | Harus pakai converter online terpisah | Sering |
| Copy teks dari gambar/screenshot | Tidak bisa — harus ketik ulang manual | Sangat Menyebalkan |

## 1.3 Visi Produk

> **"Satu shortcut untuk semua masalah clipboard."**

Smart Paste Hub menjadi **satu-satunya tool** yang user butuhkan untuk menangani clipboard. Bukan kumpulan fitur terpisah, tapi satu workflow yang terintegrasi.

```mermaid
graph LR
    A["😤 Sebelum"] --> B["😊 Sesudah"]
    
    A --- A1["Copy → Paste ke Notepad → Copy lagi → Paste"]
    A --- A2["Copy → Buka web converter → Paste → Convert → Copy → Paste"]
    A --- A3["Screenshot → Ketik ulang manual"]
    
    B --- B1["Copy → Ctrl+Alt+V → Selesai"]
    B --- B2["Copy → Pilih format → Ctrl+Alt+V → Selesai"]
    B --- B3["Ctrl+Alt+S → Screenshot → Teks otomatis di clipboard"]
```

## 1.4 Target Pengguna

```mermaid
pie title Segmen Target Pengguna
    "Developer & Technical Writer" : 30
    "Akademisi & Peneliti" : 25
    "Content Creator" : 20
    "Pekerja Kantoran" : 15
    "Power User Lainnya" : 10
```

### Persona Detail

| Persona | Profil | Pain Point Utama | Fitur Kunci |
|---------|--------|------------------|-------------|
| **Adi** (Developer) | Full-stack dev, VS Code user | JSON↔YAML konversi, kode kehilangan format | Format converter, syntax highlight |
| **Sari** (Peneliti) | Mahasiswa S2, banyak baca PDF | PDF line breaks pecah, tabel jurnal rusak | PDF fixer, table converter |
| **Budi** (Content Writer) | Nulis di Medium + WordPress | Rich text dari Docs berantakan | Strip format, keep structure |
| **Diana** (Admin) | Admin kantor, banyak email | Data sensitif di clipboard, copy berulang | Auto-clear, multi-clipboard |

## 1.5 Analisis Kompetitor

```mermaid
quadrantChart
    title Peta Kompetitor (Fitur vs Harga)
    x-axis "Fitur Sedikit" --> "Fitur Banyak"
    y-axis "Gratis" --> "Mahal"
    quadrant-1 "Overpriced"
    quadrant-2 "Premium Value"
    quadrant-3 "Basic Free"
    quadrant-4 "Sweet Spot"
    "PureText": [0.15, 0.1]
    "CleanBoard": [0.3, 0.15]
    "CleanMyClipboard": [0.25, 0.05]
    "TableToMarkdown": [0.2, 0.05]
    "PasteMagic": [0.4, 0.1]
    "SmartPaste Mac": [0.35, 0.85]
    "Smart Paste Hub": [0.9, 0.35]
```

### Perbandingan Fitur Lengkap

| Fitur | PureText | CleanBoard | PasteMagic | SmartPaste (Mac) | **Smart Paste Hub** |
|-------|:--------:|:----------:|:----------:|:----------------:|:-------------------:|
| Strip format | ✅ | ✅ | ✅ | ✅ | ✅ |
| Keep structure (bold/italic) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Fix PDF line breaks | ❌ | ❌ | ✅ | ❌ | ✅ |
| Konversi tabel | ❌ | ❌ | ❌ | ❌ | ✅ |
| JSON/YAML converter | ❌ | ❌ | ❌ | ❌ | ✅ |
| Multi-clipboard | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sensitive data masker | ❌ | ❌ | ❌ | ❌ | ✅ |
| OCR paste | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI rewrite | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cross-device sync | ❌ | ❌ | ❌ | ❌ | ✅ |
| Browser extension | ❌ | ❌ | Web only | ❌ | ✅ |
| **Harga** | Gratis | $4.99 | Gratis | $29.99/bln | Freemium |
| **Platform** | Win | Win/Mac | Web | Mac | Win/Mac/Linux |

## 1.6 Unique Selling Points (USP)

1. **All-in-One** — Satu tool menggantikan 5+ tools terpisah
2. **Privacy-First** — Semua proses lokal, data tidak pernah keluar
3. **Smart Detection** — AI mendeteksi jenis konten dan pilih format otomatis
4. **Affordable** — Freemium dengan Pro lifetime ~Rp 150rb (vs kompetitor $30/bulan)
5. **Cross-Platform** — Windows, macOS, Linux + browser + mobile

## 1.7 Business Model

```mermaid
graph TD
    subgraph "Funnel Monetisasi"
        A["🆓 Free Tier<br/>Core cleaning + auto-clear<br/>5.000 karakter/hari"] 
        B["⭐ Pro Tier<br/>Rp 150-250rb (lifetime)<br/>Semua fitur Fase 1-3"]
        C["💎 Ultimate<br/>Rp 350-500rb (lifetime)<br/>Pro + AI + OCR + Sync"]
    end
    
    A -->|"User merasakan value"| B
    B -->|"Power user butuh AI/sync"| C
    
    D["📊 Target Konversi"] --- D1["Free → Pro: 5-10%"]
    D --- D2["Pro → Ultimate: 15-25%"]
```

---

> **Dokumen selanjutnya:** [02 — Arsitektur Sistem](02-architecture.md)
