# 02 — Arsitektur Sistem

## 2.1 High-Level Architecture

```mermaid
graph TB
    subgraph "Layer 1: Input Sources"
        IS1["📄 PDF / Word"]
        IS2["🌐 Browser"]
        IS3["📊 Spreadsheet"]
        IS4["🖼️ Screenshot"]
        IS5["📱 Mobile Device"]
        IS6["💻 Aplikasi Lain"]
    end

    subgraph "Layer 2: Capture Layer"
        CW["🔍 Clipboard Watcher<br/>(WM_CLIPBOARDUPDATE)"]
        HK["⌨️ Hotkey Handler<br/>(Ctrl+Alt+V)"]
        BE["🌐 Browser Extension<br/>(Content Script)"]
        SC["📸 Screen Capture<br/>(Region Selector)"]
    end

    subgraph "Layer 3: Processing Pipeline"
        direction LR
        DET["🔎 Content<br/>Detector"]
        CLN["🧹 Cleaning<br/>Engine"]
        CNV["🔄 Format<br/>Converter"]
        SEC["🛡️ Security<br/>Scanner"]
        AI["🤖 AI<br/>Engine"]
        OCR["👁️ OCR<br/>Engine"]
    end

    subgraph "Layer 4: State Management"
        HIS["📚 History<br/>Manager"]
        SNP["📌 Snippet<br/>Store"]
        QUE["📋 Paste<br/>Queue"]
        SET["⚙️ Settings<br/>Store"]
    end

    subgraph "Layer 5: Output & Distribution"
        OUT1["📝 Ke Clipboard<br/>(Cleaned)"]
        OUT2["📱 Ke Mobile<br/>(Sync)"]
        OUT3["🔌 Ke Plugin<br/>(API)"]
    end

    IS1 & IS2 & IS3 & IS6 --> CW
    IS2 --> BE
    IS4 --> SC
    IS5 --> OUT2

    CW & HK & BE --> DET
    SC --> OCR --> DET
    DET --> CLN & CNV & SEC
    DET --> AI
    CLN & CNV & SEC & AI --> HIS & QUE
    HIS & QUE --> OUT1 & OUT2 & OUT3
    SET --> DET & CLN & CNV & SEC & AI
```

## 2.2 Component Diagram

```mermaid
graph LR
    subgraph "Electron Main Process"
        MP["Main Process<br/>(Node.js)"]
        MP --- CW2["clipboard-watcher"]
        MP --- HK2["hotkey-manager"]
        MP --- TM["tray-manager"]
        MP --- IPC["ipc-handlers"]
    end

    subgraph "Electron Renderer Process"
        RP["Renderer<br/>(React)"]
        RP --- PG1["Settings Page"]
        RP --- PG2["History Page"]
        RP --- PG3["Snippets Page"]
        RP --- PG4["Templates Page"]
        RP --- PG5["AI Settings Page"]
    end

    subgraph "Core Engine (Shared)"
        CE["Cleaning Engine"]
        CE --- HS["html-stripper"]
        CE --- LBF["line-break-fixer"]
        CE --- WN["whitespace-normalizer"]
        CE --- TD["table-detector"]
        CE --- TC["table-converter"]
        CE --- CR["context-rules"]
        CE --- RT["regex-transformer"]
    end

    subgraph "Modules"
        SEC2["Security Module"]
        SEC2 --- SD["sensitive-detector"]
        SEC2 --- DM["data-masker"]
        SEC2 --- AC["auto-clear"]

        CNV2["Converter Module"]
        CNV2 --- JYT["json-yaml-toml"]
        CNV2 --- MRT["markdown-richtext"]
        CNV2 --- SHL["syntax-highlighter"]

        PRD["Productivity Module"]
        PRD --- MCB["multi-clipboard"]
        PRD --- PQ["paste-queue"]
        PRD --- TPL["template-engine"]

        AI2["AI Module"]
        AI2 --- FD["format-detector"]
        AI2 --- ARW["ai-rewriter"]

        OCR2["OCR Module"]
        OCR2 --- SCR["screen-capture"]
        OCR2 --- OE["ocr-engine"]

        SYN["Sync Module"]
        SYN --- ENC["encryption"]
        SYN --- PAR["pairing"]
        SYN --- RLY["relay-client"]
    end

    subgraph "External"
        EXT1["Chrome Extension"]
        EXT2["Firefox Extension"]
        EXT3["Mobile App"]
        EXT4["Plugins"]
    end

    MP <-->|IPC| RP
    MP --> CE & SEC2 & CNV2 & PRD & AI2 & OCR2
    MP <-->|Native Messaging| EXT1 & EXT2
    MP <-->|WebSocket/E2E| SYN
    SYN <--> EXT3
    MP <-->|Plugin API| EXT4
```

## 2.3 Tech Stack Detail

### Desktop Application

| Layer | Teknologi | Versi | Alasan Pemilihan |
|-------|-----------|-------|------------------|
| Runtime | **Electron** | 33+ | Cross-platform, akses native API clipboard |
| Language | **TypeScript** | 5.x | Type safety, DX lebih baik dari JS |
| UI Framework | **React** | 19+ | Ekosistem besar, component-based |
| State Mgmt | **Zustand** | 5.x | Ringan, simple API, cocok untuk Electron |
| Styling | **CSS Modules** | - | Scoped, tanpa build overhead |
| Build Tool | **Vite** | 6.x | HMR cepat untuk renderer process |
| Packaging | **electron-builder** | 25+ | Multi-platform packaging |
| Testing | **Vitest** | 3.x | Cepat, compatible dengan Vite |
| Linting | **ESLint** + **Prettier** | 9.x | Code quality |

### Browser Extension

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Manifest | **Manifest V3** | Standar terbaru Chrome |
| Background | **Service Worker** | Manifest V3 requirement |
| Content Script | **TypeScript** | Konsisten dengan desktop |
| Popup UI | **React** | Reuse komponen |
| Communication | **Native Messaging** | Bridge ke desktop app |

### AI & OCR

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| OCR | **Tesseract.js** 5.x | Lokal, tanpa API, multi-bahasa |
| Local AI | **Ollama** + Phi-3/Gemma | Privacy-first, lokal |
| Cloud AI (Opsional) | **OpenAI / Gemini API** | Kualitas lebih tinggi |
| ML Detection | **ONNX Runtime** | Model ringan untuk format detection |

### Mobile & Sync

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Mobile App | **React Native** | Share TypeScript codebase |
| Sync Protocol | **WebSocket** | Real-time, bidirectional |
| Encryption | **AES-256-GCM** | Industry standard E2E |
| Relay Server | **Cloudflare Workers** | Serverless, low-cost, global edge |

## 2.4 Dependency Graph

```mermaid
graph TD
    A["electron"] --> B["electron-builder"]
    A --> C["React + ReactDOM"]
    C --> D["Zustand"]
    C --> E["CSS Modules"]
    
    F["TypeScript"] --> A
    F --> C
    F --> G["Core Engine"]
    
    G --> H["cheerio<br/>(HTML parsing)"]
    G --> I["turndown<br/>(HTML→Markdown)"]
    G --> J["marked<br/>(Markdown→HTML)"]
    G --> K["js-yaml<br/>(YAML parse/stringify)"]
    G --> L["toml<br/>(TOML parse/stringify)"]
    G --> M["highlight.js<br/>(Syntax highlighting)"]
    
    N["tesseract.js"] --> O["OCR Module"]
    P["onnxruntime-node"] --> Q["AI Format Detector"]
    
    R["crypto (Node built-in)"] --> S["Sync Encryption"]
    T["qrcode"] --> U["Device Pairing"]
    
    V["Vitest"] --> W["Test Suite"]
    G --> W

    style G fill:#4CAF50,color:white
    style A fill:#2196F3,color:white
    style N fill:#FF9800,color:white
```

## 2.5 Data Flow — Proses Utama

### Flow: User Menekan Ctrl+Alt+V

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant HK as ⌨️ Hotkey Manager
    participant CW as 🔍 Clipboard Watcher
    participant DET as 🔎 Content Detector
    participant SEC as 🛡️ Security Scanner
    participant CE as 🧹 Cleaning Engine
    participant HIS as 📚 History Manager
    participant CB as 📋 System Clipboard
    participant APP as 📝 Target App

    U->>HK: Tekan Ctrl+Alt+V
    HK->>CW: getClipboardContent()
    CW->>CW: Baca clipboard (text + HTML)
    CW->>DET: detectContentType(content)
    DET->>DET: Analisis (teks/tabel/kode/JSON/dll)
    DET-->>SEC: scan(content)
    SEC->>SEC: Deteksi PII (email, HP, NIK)
    
    alt PII Ditemukan
        SEC-->>U: Tampilkan notifikasi masking
        U-->>SEC: Pilih opsi (mask/skip)
    end
    
    SEC-->>CE: cleanedContent
    CE->>CE: Apply preset + rules
    CE->>HIS: saveToHistory(original, cleaned)
    CE->>CB: writeClipboard(cleanedContent)
    CB->>APP: Simulate Ctrl+V paste
    APP-->>U: Teks bersih ter-paste ✅
```

### Flow: OCR Screenshot-to-Text

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant HK as ⌨️ Hotkey Manager
    participant SC as 📸 Screen Capture
    participant OCR as 👁️ OCR Engine
    participant PP as 🧹 Post-Processor
    participant CB as 📋 Clipboard

    U->>HK: Tekan Ctrl+Alt+S
    HK->>SC: startRegionCapture()
    SC->>U: Tampilkan overlay seleksi area
    U->>SC: Pilih area screenshot
    SC->>SC: Capture region sebagai image
    SC->>OCR: recognizeText(image)
    OCR->>OCR: Tesseract.js processing
    OCR-->>PP: rawText
    PP->>PP: Clean artifacts, fix spacing
    PP->>CB: writeClipboard(cleanedText)
    CB-->>U: Notifikasi "Teks dari screenshot siap di-paste" ✅
```

### Flow: Cross-Device Sync

```mermaid
sequenceDiagram
    participant PC as 💻 Desktop
    participant RLY as ☁️ Relay Server
    participant HP as 📱 Mobile

    Note over PC,HP: Pairing Phase (sekali)
    PC->>PC: Generate keypair + pairing code
    PC->>RLY: Register device (public key)
    HP->>HP: Scan QR code dari PC
    HP->>RLY: Register device (public key)
    RLY-->>PC: Pairing confirmed ✅
    RLY-->>HP: Pairing confirmed ✅

    Note over PC,HP: Sync Phase (berkelanjutan)
    PC->>PC: User copy teks
    PC->>PC: Encrypt(AES-256, content)
    PC->>RLY: Send encrypted payload
    RLY->>HP: Forward encrypted payload
    HP->>HP: Decrypt(AES-256, payload)
    HP-->>HP: Tampilkan di clipboard ✅
    
    Note over PC,HP: Reverse juga bisa
    HP->>HP: User copy di HP
    HP->>RLY: Send encrypted
    RLY->>PC: Forward
    PC->>PC: Decrypt + tampilkan
```

## 2.6 Folder Structure (Final, Semua Fase)

```
smartpastehub/
├── package.json                    # Dependencies & scripts
├── electron-builder.yml            # Packaging config
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite config (renderer)
├── vitest.config.ts                # Test config
├── .eslintrc.js                    # Linting rules
├── .prettierrc                     # Formatting rules
│
├── src/
│   ├── main/                       # ── Electron Main Process ──
│   │   ├── index.ts                # Entry point
│   │   ├── clipboard-watcher.ts    # Monitor clipboard (WM_CLIPBOARDUPDATE)
│   │   ├── hotkey-manager.ts       # Global shortcut registration
│   │   ├── tray-manager.ts         # System tray icon & menu
│   │   └── ipc-handlers.ts         # IPC bridge main↔renderer
│   │
│   ├── renderer/                   # ── Electron Renderer Process (React) ──
│   │   ├── App.tsx                 # Root component + router
│   │   ├── main.tsx                # ReactDOM entry
│   │   ├── pages/
│   │   │   ├── Settings.tsx        # Settings page
│   │   │   ├── History.tsx         # History browser
│   │   │   ├── Snippets.tsx        # Snippet manager
│   │   │   ├── Templates.tsx       # Template editor
│   │   │   └── AISettings.tsx      # AI/OCR settings
│   │   ├── components/
│   │   │   ├── PresetSelector.tsx
│   │   │   ├── HotkeyConfig.tsx
│   │   │   ├── HistoryList.tsx
│   │   │   ├── SnippetCard.tsx
│   │   │   ├── TemplateEditor.tsx
│   │   │   ├── UsageMeter.tsx
│   │   │   ├── OCRPreview.tsx
│   │   │   └── RewritePreview.tsx
│   │   ├── stores/                 # Zustand stores
│   │   │   ├── settings-store.ts
│   │   │   ├── history-store.ts
│   │   │   └── ui-store.ts
│   │   └── styles/
│   │       ├── index.css           # Global styles
│   │       ├── variables.css       # Design tokens
│   │       └── components/         # Component CSS modules
│   │
│   ├── core/                       # ── Cleaning Engine ──
│   │   ├── cleaner.ts              # Main orchestrator
│   │   ├── html-stripper.ts        # Strip HTML/CSS
│   │   ├── line-break-fixer.ts     # Smart PDF merge
│   │   ├── whitespace-normalizer.ts
│   │   ├── table-detector.ts       # Detect table content
│   │   ├── table-converter.ts      # Table → Markdown/plain
│   │   ├── context-rules.ts        # Source/target routing
│   │   ├── regex-transformer.ts    # Custom regex rules
│   │   └── presets.ts              # Preset definitions
│   │
│   ├── security/                   # ── Security Module ──
│   │   ├── sensitive-detector.ts   # PII regex detection
│   │   ├── data-masker.ts          # Mask sensitive data
│   │   └── auto-clear.ts           # Timer-based clear
│   │
│   ├── converter/                  # ── Format Converters ──
│   │   ├── json-yaml-toml.ts       # JSON ↔ YAML ↔ TOML
│   │   ├── markdown-richtext.ts    # Markdown ↔ Rich Text
│   │   └── syntax-highlighter.ts   # Code → highlighted
│   │
│   ├── productivity/               # ── Productivity Features ──
│   │   ├── multi-clipboard.ts      # Multi-clipboard merge
│   │   ├── paste-queue.ts          # FIFO queue
│   │   └── template-engine.ts      # Variable substitution
│   │
│   ├── ai/                         # ── AI Engine ──
│   │   ├── format-detector.ts      # Smart content detection
│   │   ├── ai-rewriter.ts          # Grammar fix / rewrite
│   │   └── model-manager.ts        # Local model management
│   │
│   ├── ocr/                        # ── OCR Engine ──
│   │   ├── screen-capture.ts       # Region selector
│   │   ├── ocr-engine.ts           # Tesseract.js wrapper
│   │   └── ocr-post-processor.ts   # Clean OCR output
│   │
│   ├── sync/                       # ── Cross-Device Sync ──
│   │   ├── sync-manager.ts         # Sync orchestrator
│   │   ├── encryption.ts           # AES-256-GCM E2E
│   │   ├── pairing.ts              # QR code pairing
│   │   └── relay-client.ts         # WebSocket relay
│   │
│   ├── plugins/                    # ── Plugin System ──
│   │   ├── plugin-api.ts           # Plugin interface
│   │   ├── plugin-loader.ts        # Dynamic loader
│   │   └── plugin-store.ts         # Marketplace
│   │
│   └── shared/                     # ── Shared Types & Utils ──
│       ├── types.ts                # TypeScript interfaces
│       ├── constants.ts            # App constants
│       └── utils.ts                # Utility functions
│
├── extension/                      # ── Browser Extension ──
│   ├── manifest.json               # Chrome Manifest V3
│   ├── background.ts               # Service worker
│   ├── content-script.ts           # Page injection
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.tsx
│   │   └── popup.css
│   └── native-messaging/
│       └── host-config.json
│
├── mobile/                         # ── Mobile Companion App ──
│   ├── package.json
│   ├── App.tsx
│   └── src/
│       ├── screens/
│       │   └── ClipboardSync.tsx
│       └── services/
│           └── sync-service.ts
│
├── relay-server/                   # ── Cloud Relay ──
│   ├── wrangler.toml               # Cloudflare Workers config
│   └── src/
│       └── index.ts                # WebSocket relay handler
│
├── tests/                          # ── Test Suite ──
│   ├── core/
│   ├── security/
│   ├── converter/
│   ├── productivity/
│   ├── ai/
│   ├── ocr/
│   ├── sync/
│   └── fixtures/
│
├── assets/                         # ── Static Assets ──
│   ├── icons/                      # App icons (all sizes)
│   ├── tray/                       # Tray icons
│   └── onboarding/                 # Onboarding images
│
└── docs/                           # ── Documentation ──
    ├── 00-daftar-isi.md
    ├── 01-overview.md
    ├── 02-architecture.md          # (file ini)
    └── ...
```

## 2.7 Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV["👨‍💻 Developer"]
        GH["GitHub Repository"]
        CI["GitHub Actions CI/CD"]
    end

    subgraph "Distribution"
        EB["electron-builder"]
        CWS["Chrome Web Store"]
        FWS["Firefox Add-ons"]
        MS["Microsoft Store"]
        MAS["Mac App Store"]
        GHR["GitHub Releases"]
        AS["App Store (Mobile)"]
        PS["Play Store (Mobile)"]
    end

    subgraph "Infrastructure"
        CFW["Cloudflare Workers<br/>(Relay Server)"]
        R2["Cloudflare R2<br/>(Update hosting)"]
    end

    DEV --> GH --> CI
    CI --> EB --> MS & MAS & GHR
    CI --> CWS & FWS
    CI --> AS & PS
    CI --> CFW & R2
```

---

> **Dokumen selanjutnya:** [03 — Backend & Core Engine](03-backend-design.md)
