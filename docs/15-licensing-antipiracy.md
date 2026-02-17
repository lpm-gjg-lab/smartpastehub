# 15 — Licensing, Langganan & Anti-Pembajakan

## 15.1 Model Bisnis — Subscription vs Lifetime

```mermaid
graph TD
    subgraph "Pricing Options"
        F["🆓 Free Tier<br/>Gratis selamanya"]
        P["💎 Pro<br/>Rp 49.000/bulan<br/>atau Rp 349.000/tahun"]
        U["🚀 Ultimate<br/>Rp 99.000/bulan<br/>atau Rp 699.000/tahun"]
        L["🏷️ Lifetime (Opsional)<br/>Pro: Rp 899.000<br/>Ultimate: Rp 1.499.000"]
    end

    subgraph "Feature Gating"
        F --> F1["5.000 char/hari<br/>Basic presets<br/>10 history items"]
        P --> P1["Unlimited chars<br/>All presets + custom<br/>Unlimited history<br/>Tables + Converters<br/>Security module"]
        U --> U1["Semua Pro +<br/>AI Rewrite<br/>OCR<br/>Cross-Device Sync<br/>Plugin system"]
    end
```

## 15.2 Arsitektur License Server

```mermaid
graph TB
    subgraph "Client (Desktop App)"
        APP["Smart Paste Hub"]
        LM["License Manager"]
        LC["License Cache<br/>(encrypted local)"]
    end

    subgraph "License Server (Cloud)"
        API["License API<br/>(Cloudflare Workers)"]
        DB["Database<br/>(Turso / D1)"]
        PAY["Payment Gateway<br/>(Stripe / Midtrans)"]
        DASH["Admin Dashboard<br/>(Web App)"]
    end

    APP --> LM
    LM <-->|"HTTPS + JWT"| API
    LM --> LC
    API --> DB
    API <--> PAY
    DASH --> API
    DASH --> DB
```

## 15.3 Admin Dashboard — Fitur Pengelolaan

### Overview Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Smart Paste Hub — Admin Dashboard                          │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ 📊 Overview │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ 👥 Users    │  │ 1.247│ │  312 │ │   87 │ │ Rp   │        │
│ 💳 Langganan│  │ Total│ │ Pro  │ │ Ulti │ │42.3jt│        │
│ 📦 License  │  │Users │ │Subs  │ │Subs  │ │MRR   │        │
│ 💰 Revenue  │  └──────┘ └──────┘ └──────┘ └──────┘        │
│ 📈 Analytics│                                               │
│ ⚙️ Settings │  📈 Subscription Growth (30 hari terakhir)    │
│ 🚨 Alerts   │  ┌───────────────────────────────────────┐   │
│             │  │ ▄▃▅▆▇▆▅▆▇▇▉█ Pro                     │   │
│             │  │ ▂▂▃▃▄▅▅▅▆▆▇▇ Ultimate                │   │
│             │  └───────────────────────────────────────┘   │
│             │                                               │
│             │  ⚠️ Alerts                                    │
│             │  • 3 license key abuse terdeteksi             │
│             │  • 12 failed payment retries                  │
│             │  • 2 chargeback disputes                      │
└──────────┴──────────────────────────────────────────────────┘
```

### Manajemen Langganan

```
┌─────────────────────────────────────────────────────────────┐
│  💳 Subscription Management                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 [Search user / email / license key        ] [🔍 Cari]  │
│  Filter: [Semua ▾] [Status: Active ▾] [Plan: All ▾]       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Email          │ Plan     │ Status  │ Exp. Date  │ ⚙️│   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ adi@mail.com   │ Pro/Yr   │ 🟢 Active│ 2027-02-16│ ⚙️│   │
│  │ sari@mail.com  │ Ultimate │ 🟢 Active│ 2026-08-01│ ⚙️│   │
│  │ budi@mail.com  │ Pro/Mo   │ 🟡 Grace │ 2026-02-20│ ⚙️│   │
│  │ dewi@mail.com  │ Ultimate │ 🔴 Expired│ 2026-01-15│ ⚙️│   │
│  │ rudi@mail.com  │ Pro/Life │ 🟢 Active│ Never     │ ⚙️│   │
│  │ ⚠️ hacker@...  │ Ultimate │ 🚫 Banned│ -         │ ⚙️│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Showing 1-20 of 399  [< Prev] [Next >]                   │
│                                                             │
│  ── Quick Stats ──                                          │
│  Active: 312 │ Grace Period: 15 │ Expired: 72 │ Banned: 3  │
└─────────────────────────────────────────────────────────────┘
```

### Detail User — Admin Actions

```
┌─────────────────────────────────────────────────────────────┐
│  👤 User Detail: adi@mail.com                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── Info ──                                                 │
│  Email: adi@mail.com                                        │
│  Plan: Pro (Yearly)                                         │
│  Status: 🟢 Active                                          │
│  Registered: 2026-01-15                                     │
│  Expiry: 2027-02-16                                         │
│  License Key: SPH-PRO-XXXX-XXXX-XXXX                       │
│                                                             │
│  ── Device Activations ──                                   │
│  1. DESKTOP-ADI (Windows 11) — Primary ✓                   │
│  2. MACBOOK-ADI (macOS 14) — 2026-02-01                    │
│  Max devices: 3 │ Used: 2                                   │
│                                                             │
│  ── Payment History ──                                      │
│  2026-02-16 │ Rp 349.000 │ Yearly renewal │ ✅ Paid         │
│  2026-01-16 │ Rp 349.000 │ Initial sub    │ ✅ Paid         │
│                                                             │
│  ── Admin Actions ──                                        │
│  [🔄 Extend 30 hari] [⏸️ Suspend] [🚫 Ban + Revoke]       │
│  [🔑 Reset License Key] [🖥️ Remove Device] [💳 Refund]     │
│  [📧 Send Email] [📝 Add Note]                              │
│                                                             │
│  ── Admin Notes ──                                          │
│  2026-02-10: User request extend, diberikan 7 hari gratis   │
└─────────────────────────────────────────────────────────────┘
```

## 15.4 Admin Actions — Detail

| Action | Deskripsi | Use Case |
|--------|-----------|----------|
| **Extend** | Perpanjang subscription X hari | Kompensasi downtime, promo, CS goodwill |
| **Suspend** | Nonaktifkan sementara (bisa re-activate) | Payment dispute, investigasi abuse |
| **Ban + Revoke** | Banned permanen, revoke semua device | Pembajakan terkonfirmasi |
| **Reset License Key** | Generate key baru, invalidate yang lama | Key bocor / dipakai orang lain |
| **Remove Device** | Hapus aktivasi device tertentu | User ganti laptop, device limit penuh |
| **Refund** | Proses refund via payment gateway | Dispute, ketidakpuasan |
| **Send Email** | Kirim email ke user dari dashboard | Notification, warning |
| **Add Note** | Catatan internal admin | Pelacakan CS interaction |

## 15.5 Subscription Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Free: Register
    Free --> Trialing: Start trial (7 hari)
    Trialing --> Active: Pembayaran berhasil
    Trialing --> Free: Trial expired, tidak bayar
    
    Active --> Active: Renewal berhasil
    Active --> GracePeriod: Payment failed
    GracePeriod --> Active: Retry payment berhasil
    GracePeriod --> Expired: 7 hari tanpa pembayaran
    
    Expired --> Active: User bayar manual
    Expired --> Free: Downgrade otomatis
    
    Active --> Suspended: Admin suspend
    Suspended --> Active: Admin re-activate
    Suspended --> Banned: Admin konfirmasi piracy
    
    Active --> Cancelled: User cancel
    Cancelled --> Free: End of billing period
    Cancelled --> Active: User resubscribe

    Banned --> [*]: Akun ditutup
```

## 15.6 Payment Integration

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant APP as 💻 App
    participant API as 🌐 License API
    participant PAY as 💳 Stripe/Midtrans
    participant ADMIN as 👨‍💼 Admin

    U->>APP: Klik "Upgrade to Pro"
    APP->>API: POST /checkout { plan, email }
    API->>PAY: Create checkout session
    PAY-->>APP: Redirect ke payment page
    U->>PAY: Input kartu / e-wallet
    PAY->>PAY: Process payment
    
    alt Payment berhasil
        PAY->>API: Webhook: payment.success
        API->>API: Generate license key
        API->>API: Create subscription record
        API-->>APP: License key + activation
        APP->>APP: Unlock Pro features ✅
        API->>ADMIN: Dashboard updated
    else Payment gagal
        PAY->>API: Webhook: payment.failed
        API-->>APP: Show error
        APP->>U: "Pembayaran gagal, coba lagi"
    end

    Note over PAY,API: Recurring: auto-charge setiap bulan/tahun
    PAY->>API: Webhook: invoice.paid (recurring)
    API->>API: Extend subscription
```

### Payment Gateway Options

| Gateway | Market | Metode Pembayaran | Biaya |
|---------|--------|-------------------|-------|
| **Stripe** | Global | Kartu kredit, Apple Pay, Google Pay | 2.9% + $0.30 |
| **Midtrans** | Indonesia | GoPay, OVO, DANA, BCA VA, Mandiri, BRI | 0.7% - 2.9% |
| **Xendit** | Southeast Asia | E-wallet, bank transfer, QRIS | 1.5% - 2.9% |

> **Rekomendasi**: Gunakan **Midtrans** untuk pasar Indonesia (e-wallet populer) + **Stripe** untuk pasar global.

## 15.7 License Key System

### Format License Key

```
SPH-[TIER]-[XXXX]-[XXXX]-[XXXX]

Contoh:
  SPH-PRO-A3K9-M7X2-P5N1     (Pro)
  SPH-ULT-B8J4-Q2W6-R9T3     (Ultimate)
  SPH-PLF-C1D5-S4V8-K7L2     (Pro Lifetime)
  SPH-ULF-D6F0-T3U9-H8M4     (Ultimate Lifetime)
```

### Activation Flow

```mermaid
sequenceDiagram
    participant APP as 💻 App
    participant API as 🌐 License API
    participant DB as 🗄️ Database

    APP->>API: POST /activate { key, deviceId, deviceName, os }
    API->>DB: Lookup key
    
    alt Key valid
        API->>DB: Check device count
        alt Devices < maxDevices
            API->>DB: Register device activation
            API-->>APP: { valid: true, plan: "pro", expiresAt: "..." }
            APP->>APP: Store encrypted license locally
            APP->>APP: Unlock features ✅
        else Device limit reached
            API-->>APP: { valid: false, error: "DEVICE_LIMIT" }
            APP->>APP: "Batas device tercapai. Hapus device lain di dashboard."
        end
    else Key invalid/expired/banned
        API-->>APP: { valid: false, error: "INVALID_KEY" }
    end
```

## 15.8 Anti-Pembajakan — Strategi Multi-Layer

```mermaid
graph TD
    subgraph "Layer 1: Deterrent (Pencegahan)"
        L1A["Device fingerprinting"]
        L1B["License key binding ke device"]
        L1C["Online activation required"]
    end

    subgraph "Layer 2: Detection (Deteksi)"
        L2A["Heartbeat check (periodik)"]
        L2B["Concurrent usage monitoring"]
        L2C["Anomaly detection"]
    end

    subgraph "Layer 3: Response (Respons)"
        L3A["Grace degradation<br/>(fitur dimatikan perlahan)"]
        L3B["Admin alert + investigasi"]
        L3C["Ban + revoke jika terbukti"]
    end

    subgraph "Layer 4: Business (Bisnis)"
        L4A["Pricing yang terjangkau"]
        L4B["Free tier yang berguna"]
        L4C["Value proposition > cost of piracy"]
    end

    L1A & L1B & L1C --> L2A & L2B & L2C
    L2A & L2B & L2C --> L3A & L3B & L3C
    L4A & L4B & L4C -.->|"Kurangi motivasi<br/>membajak"| L1A
```

### Layer 1: Device Fingerprinting & Binding

```typescript
// src/licensing/device-fingerprint.ts

interface DeviceFingerprint {
  machineId: string;        // Dari OS (WMI di Win, IOPlatformUUID di Mac)
  hostname: string;
  os: string;
  osVersion: string;
  cpuModel: string;
  totalMemory: number;
}

function generateDeviceId(fp: DeviceFingerprint): string {
  // Hash gabungan machineId + hostname + os
  // Toleransi: minor changes (RAM upgrade) tidak breakdown
  const stable = `${fp.machineId}:${fp.hostname}:${fp.os}`;
  return sha256(stable).substring(0, 32);
}

// Max devices per tier:
// Pro:      3 devices
// Ultimate: 5 devices
// Lifetime: 3 devices (Pro) / 5 devices (Ultimate)
```

### Layer 2: Heartbeat & Monitoring

```mermaid
sequenceDiagram
    participant APP as 💻 App
    participant API as 🌐 License API
    participant ALERT as 🚨 Alert System

    loop Setiap 24 jam
        APP->>API: POST /heartbeat { deviceId, licenseKey, version }
        API->>API: Validasi license
        
        alt License valid, usage normal
            API-->>APP: { status: "ok", features: [...] }
        else License expired
            API-->>APP: { status: "expired" }
            APP->>APP: Downgrade ke Free tier
        else Terlalu banyak device aktif bersamaan
            API-->>APP: { status: "abuse_detected" }
            API->>ALERT: Flag akun untuk review
            APP->>APP: Warning ke user
        else License key di-ban
            API-->>APP: { status: "revoked" }
            APP->>APP: Force downgrade + clear license
        end
    end
```

```typescript
// Anti-abuse detection
interface AbuseIndicators {
  // 🚩 Red flags:
  sameKeyOnMoreThanMaxDevices: boolean;   // Key dipakai > device limit
  differentIPsInShortTime: boolean;       // 10+ unique IPs dalam 1 jam
  rapidDeviceRotation: boolean;           // Ganti device > 5x/hari
  keySharedOnline: boolean;               // Key ditemukan di forum/pastebin
}
```

### Layer 3: Graceful Degradation (Bukan Hard Lock)

```mermaid
flowchart TD
    A["License issue terdeteksi"] --> B{"Severity?"}
    
    B -->|"Low: expired"| C["Grace period 7 hari<br/>Semua fitur masih aktif<br/>Tampilkan reminder"]
    
    B -->|"Medium: abuse"| D["Warning ke user<br/>Fitur AI/OCR dimatikan<br/>Core tetap berfungsi<br/>Admin di-notify"]
    
    B -->|"High: confirmed piracy"| E["30-hari countdown<br/>Fitur dikurangi bertahap:<br/>Hari 1-10: disable AI/OCR<br/>Hari 11-20: disable converters<br/>Hari 21-30: disable history<br/>Hari 30+: Free tier only"]
    
    B -->|"Critical: mass distribution"| F["Immediate revoke<br/>License key di-blacklist<br/>All devices forced logout<br/>Admin: ban akun"]
```

> [!IMPORTANT]
> **Filosofi: Graceful Degradation, bukan Hard Lock.**
> Jangan pernah membuat app completely unusable — ini membuat user frustrasi dan mendorong penggunaan crack yang lebih agresif. Sebaliknya, kurangi fitur secara bertahap sehingga user merasakan value dari berbayar.

### Layer 4: Business Strategy Anti-Piracy

```mermaid
mindmap
  root(("🛡️ Business<br/>Anti-Piracy"))
    Affordable Pricing
      Regional pricing (ID vs global)
      Student/edu discount 50%
      Startup plan (small team)
    Generous Free Tier
      Core cleaning tetap gratis
      5.000 char/hari cukup untuk casual
      Reduce motivasi bajak
    Value Beyond Software
      Cloud sync (butuh server aktif)
      Plugin marketplace (butuh akun)
      Priority support
      Early access fitur baru
    Community Building
      Open source core engine
      Community-driven plugins
      Kontributor dapat Pro gratis
```

## 15.9 License Database Schema

```sql
-- ══════════════════════════════
-- LICENSE SERVER DATABASE
-- ══════════════════════════════

CREATE TABLE users (
    id              TEXT PRIMARY KEY,  -- UUID
    email           TEXT UNIQUE NOT NULL,
    name            TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status          TEXT NOT NULL DEFAULT 'active'
    -- Enum: active, suspended, banned
);

CREATE TABLE subscriptions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    plan            TEXT NOT NULL,     -- free, pro, ultimate
    billing_cycle   TEXT NOT NULL,     -- monthly, yearly, lifetime
    status          TEXT NOT NULL DEFAULT 'active',
    -- Enum: trialing, active, grace_period, expired, cancelled, suspended, banned
    stripe_sub_id   TEXT,
    midtrans_sub_id TEXT,
    started_at      DATETIME NOT NULL,
    expires_at      DATETIME,         -- NULL untuk lifetime
    cancelled_at    DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE license_keys (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
    key             TEXT UNIQUE NOT NULL,  -- SPH-PRO-XXXX-XXXX-XXXX
    max_devices     INTEGER NOT NULL DEFAULT 3,
    status          TEXT NOT NULL DEFAULT 'active',
    -- Enum: active, revoked, expired
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_activations (
    id              TEXT PRIMARY KEY,
    license_key_id  TEXT NOT NULL REFERENCES license_keys(id),
    device_id       TEXT NOT NULL,         -- Hashed fingerprint
    device_name     TEXT,
    os              TEXT,
    ip_address      TEXT,
    last_heartbeat  DATETIME,
    activated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(license_key_id, device_id)
);

CREATE TABLE payment_history (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    subscription_id TEXT REFERENCES subscriptions(id),
    amount          INTEGER NOT NULL,      -- Dalam rupiah
    currency        TEXT DEFAULT 'IDR',
    gateway         TEXT,                  -- stripe, midtrans
    gateway_txn_id  TEXT,
    status          TEXT NOT NULL,
    -- Enum: pending, paid, failed, refunded, disputed
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_notes (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    admin_email     TEXT NOT NULL,
    note            TEXT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE abuse_logs (
    id              TEXT PRIMARY KEY,
    license_key_id  TEXT REFERENCES license_keys(id),
    type            TEXT NOT NULL,
    -- Enum: device_limit_exceeded, rapid_rotation, concurrent_usage,
    --       key_shared_online, suspicious_ip
    details         TEXT,                  -- JSON
    resolved        INTEGER DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## 15.10 Offline Grace Period

```mermaid
flowchart TD
    A["App start"] --> B{"Internet tersedia?"}
    B -->|Ya| C["Heartbeat ke license server"]
    C --> D{"License valid?"}
    D -->|Ya| E["Update local cache<br/>timestamp = now"]
    D -->|Tidak| F["Downgrade"]
    
    B -->|Tidak| G{"Local cache ada?"}
    G -->|Ya| H{"Cache age < 30 hari?"}
    H -->|Ya| I["✅ Offline grace period<br/>Semua fitur tetap aktif"]
    H -->|Tidak| J["⚠️ Perlu online verification<br/>Downgrade ke Free"]
    G -->|Tidak| K["Belum pernah activate<br/>Free tier only"]
```

> [!NOTE]
> User yang sah tidak akan terganggu oleh sistem anti-piracy. Verification hanya perlu online **sekali per 30 hari**. Selebihnya app berfungsi penuh secara offline.

---

> 📖 **Kembali ke:** [Daftar Isi](00-daftar-isi.md)
