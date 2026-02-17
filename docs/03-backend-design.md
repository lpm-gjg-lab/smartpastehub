# 03 — Backend & Core Engine Design

## 3.1 Processing Pipeline

```mermaid
graph LR
    A["📋 Raw Clipboard"] --> B["🔎 Content Detector"]
    B --> C{"Jenis Konten?"}
    
    C -->|"HTML styled"| D["html-stripper"]
    C -->|"PDF text"| E["line-break-fixer"]
    C -->|"Table data"| F["table-converter"]
    C -->|"JSON/YAML/TOML"| G["format-converter"]
    C -->|"Source code"| H["syntax-highlighter"]
    C -->|"Plain text"| I["whitespace-normalizer"]
    
    D & E & F & G & H & I --> J["🛡️ Security Scanner"]
    J --> K["📋 Cleaned Output"]
```

## 3.2 Content Detector — Algoritma Deteksi

```mermaid
flowchart TD
    A["Input: clipboard content"] --> B{"Apakah HTML?"}
    B -->|Ya| C{"Ada <table>?"}
    C -->|Ya| D["TYPE: HTML_TABLE"]
    C -->|No| E{"Ada inline styles?"}
    E -->|Ya| F["TYPE: STYLED_HTML"]
    E -->|No| G["TYPE: STRUCTURED_HTML"]
    
    B -->|No| H{"Tab-separated?"}
    H -->|Ya| I["TYPE: TSV_TABLE"]
    H -->|No| J{"Comma-separated + header?"}
    J -->|Ya| K["TYPE: CSV_TABLE"]
    J -->|No| L{"Valid JSON?"}
    L -->|Ya| M["TYPE: JSON_DATA"]
    L -->|No| N{"Valid YAML?"}
    N -->|Ya| O["TYPE: YAML_DATA"]
    N -->|No| P{"Ada code patterns?"}
    P -->|Ya| Q["TYPE: SOURCE_CODE"]
    P -->|No| R{"Short lines + no punctuation end?"}
    R -->|Ya| S["TYPE: PDF_TEXT"]
    R -->|No| T["TYPE: PLAIN_TEXT"]
```

### Interface Content Detector

```typescript
// src/core/content-detector.ts

enum ContentType {
  PLAIN_TEXT = 'plain_text',
  PDF_TEXT = 'pdf_text',
  STYLED_HTML = 'styled_html',
  STRUCTURED_HTML = 'structured_html',
  HTML_TABLE = 'html_table',
  TSV_TABLE = 'tsv_table',
  CSV_TABLE = 'csv_table',
  JSON_DATA = 'json_data',
  YAML_DATA = 'yaml_data',
  TOML_DATA = 'toml_data',
  SOURCE_CODE = 'source_code',
  EMAIL_TEXT = 'email_text',
  ADDRESS = 'address',
  UNKNOWN = 'unknown',
}

interface DetectionResult {
  type: ContentType;
  confidence: number;       // 0.0 - 1.0
  language?: string;        // untuk source code
  metadata: Record<string, unknown>;
}

function detectContentType(
  text: string,
  html?: string
): DetectionResult;
```

## 3.3 Cleaning Engine — Core Logic

### HTML Stripper

```typescript
// src/core/html-stripper.ts

interface StripOptions {
  keepBold: boolean;        // Pertahankan <b>/<strong>
  keepItalic: boolean;      // Pertahankan <i>/<em>
  keepLists: boolean;       // Pertahankan <ul>/<ol>/<li>
  keepLinks: boolean;       // Pertahankan <a href>
  keepHeadings: boolean;    // Pertahankan <h1>-<h6>
  keepLineBreaks: boolean;  // Pertahankan <br>/<p>
}

// Preset configurations
const PRESETS = {
  plainText: {
    keepBold: false, keepItalic: false, keepLists: false,
    keepLinks: false, keepHeadings: false, keepLineBreaks: true,
  },
  keepStructure: {
    keepBold: true, keepItalic: true, keepLists: true,
    keepLinks: true, keepHeadings: true, keepLineBreaks: true,
  },
};

function stripHTML(html: string, options: StripOptions): string;
```

### PDF Line-Break Fixer — Heuristik

```mermaid
flowchart TD
    A["Input: teks dari PDF"] --> B["Split per baris"]
    B --> C["Untuk setiap baris i:"]
    C --> D{"Baris i berakhir<br/>dengan . ? ! :"}
    D -->|Ya| E["Akhir paragraf → KEEP break"]
    D -->|No| F{"Baris i+1 dimulai<br/>huruf kapital?"}
    F -->|Ya| G{"Panjang baris i<br/>< 60 char?"}
    G -->|Ya| H["Kemungkinan heading → KEEP break"]
    G -->|No| I["Paragraf baru → KEEP break"]
    F -->|No| J{"Baris i sangat pendek<br/>< 40 char?"}
    J -->|Ya| K{"Ada pattern daftar<br/>(-, *, 1., •)?"}
    K -->|Ya| L["List item → KEEP break"]
    K -->|No| M["Line wrap artifact → MERGE"]
    J -->|No| M
```

```typescript
// src/core/line-break-fixer.ts

interface FixerOptions {
  minLineLength: number;     // Default: 40
  maxLineLength: number;     // Default: 80
  preserveListItems: boolean;
  preserveHeadings: boolean;
  language: 'id' | 'en';    // Affects heuristics
}

function fixLineBreaks(text: string, options?: FixerOptions): string;
```

## 3.4 Table Converter

```typescript
// src/core/table-converter.ts

interface TableData {
  headers: string[];
  rows: string[][];
  alignment?: ('left' | 'center' | 'right')[];
}

// Deteksi & parse
function parseHTMLTable(html: string): TableData;
function parseTSV(text: string): TableData;
function parseCSV(text: string): TableData;

// Konversi
function toMarkdown(table: TableData): string;
function toPlainText(table: TableData, padding?: number): string;
function toCSV(table: TableData): string;

// Contoh output Markdown:
// | Nama  | Umur | Kota     |
// |-------|------|----------|
// | Adi   | 28   | Jakarta  |
// | Sari  | 25   | Bandung  |
```

## 3.5 Format Converters

```typescript
// src/converter/json-yaml-toml.ts

type DataFormat = 'json' | 'yaml' | 'toml';

function detectFormat(text: string): DataFormat | null;
function convert(text: string, from: DataFormat, to: DataFormat): string;

// Auto-detect & convert
function autoConvert(text: string, targetFormat: DataFormat): string;
```

```typescript
// src/converter/markdown-richtext.ts

// Markdown → Rich Text (HTML with inline styles)
function markdownToRichText(markdown: string): string;

// Rich Text (HTML) → Markdown
function richTextToMarkdown(html: string): string;
```

```typescript
// src/converter/syntax-highlighter.ts

interface HighlightOptions {
  language?: string;       // Auto-detect jika tidak diset
  theme: 'dark' | 'light';
  lineNumbers: boolean;
}

// Menghasilkan HTML rich text dengan syntax highlighting
function highlightCode(code: string, options: HighlightOptions): string;
```

## 3.6 Security Module

```mermaid
flowchart TD
    A["Input: clipboard content"] --> B["Regex Scanner"]
    B --> C{"Email ditemukan?"}
    B --> D{"No. HP ditemukan?"}
    B --> E{"NIK ditemukan?"}
    B --> F{"Kartu kredit ditemukan?"}
    
    C & D & E & F -->|"Minimal 1 Ya"| G["Tampilkan notifikasi"]
    G --> H{"User pilih?"}
    H -->|"Mask penuh"| I["****@****.com"]
    H -->|"Mask partial"| J["u***@gm***.com"]
    H -->|"Skip"| K["Biarkan apa adanya"]
    
    C & D & E & F -->|"Semua Tidak"| L["Pass through"]
```

```typescript
// src/security/sensitive-detector.ts

interface SensitiveMatch {
  type: 'email' | 'phone' | 'nik' | 'credit_card' | 'custom';
  value: string;
  startIndex: number;
  endIndex: number;
}

const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone_id: /(\+62|62|0)[\s-]?8[1-9][\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}/g,
  nik: /\b\d{16}\b/g,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
};

function detectSensitiveData(text: string): SensitiveMatch[];
```

```typescript
// src/security/data-masker.ts

type MaskMode = 'full' | 'partial' | 'skip';

function maskData(
  text: string,
  matches: SensitiveMatch[],
  mode: MaskMode
): string;

// Contoh:
// full:    "email@test.com" → "****@****.***"
// partial: "email@test.com" → "e***l@t***.com"
```

## 3.7 Productivity Module

### Multi-Clipboard & Paste Queue — State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Collecting: User aktifkan Multi-Copy mode
    Collecting --> Collecting: Ctrl+C (tambah item)
    Collecting --> Ready: User selesai (max items / manual stop)
    Ready --> Pasting: Ctrl+Alt+V
    Pasting --> Idle: Semua item ter-paste

    Idle --> QueueMode: User aktifkan Paste Queue
    QueueMode --> QueueMode: Ctrl+C (tambah ke antrian)
    QueueMode --> QueuePaste: Ctrl+Alt+V (paste item pertama)
    QueuePaste --> QueueMode: Masih ada item
    QueuePaste --> Idle: Antrian kosong
```

```typescript
// src/productivity/multi-clipboard.ts

interface MultiClipboard {
  items: string[];
  maxItems: number;        // Default: 10
  separator: string;       // Default: '\n'
  isCollecting: boolean;
}

function startCollecting(): void;
function addItem(text: string): void;
function mergeAndPaste(separator?: string): string;
function clear(): void;
```

```typescript
// src/productivity/template-engine.ts

interface Template {
  id: string;
  name: string;
  content: string;         // "Halo {nama}, order #{id}"
  variables: string[];     // ['nama', 'id']
  tags: string[];
}

function parseTemplate(content: string): string[];
function fillTemplate(
  template: Template,
  values: Record<string, string>
): string;
```

## 3.8 AI Module

```mermaid
flowchart TD
    A["Input: clipboard content"] --> B{"AI aktif?"}
    B -->|Tidak| C["Skip, gunakan rule-based detection"]
    B -->|Ya| D{"Local model tersedia?"}
    D -->|Ya| E["ONNX Runtime<br/>format-detector model"]
    D -->|Tidak| F{"Cloud API dikonfigurasi?"}
    F -->|Ya| G["OpenAI / Gemini API"]
    F -->|Tidak| C
    
    E & G --> H["Prediction:<br/>contentType + confidence"]
    H --> I{"Confidence > 0.8?"}
    I -->|Ya| J["Auto-apply preset"]
    I -->|Tidak| K["Suggest preset ke user"]
```

```typescript
// src/ai/format-detector.ts

interface AIDetectionResult {
  type: ContentType;
  confidence: number;
  suggestedPreset: string;
  suggestedActions: string[];
}

// Menggunakan lightweight ONNX model
async function detectWithAI(text: string): Promise<AIDetectionResult>;
```

```typescript
// src/ai/ai-rewriter.ts

type RewriteMode = 'fix_grammar' | 'rephrase' | 'summarize' | 'formalize';

interface RewriteOptions {
  mode: RewriteMode;
  language: 'id' | 'en';
  provider: 'local' | 'openai' | 'gemini';
}

async function rewriteText(
  text: string,
  options: RewriteOptions
): Promise<string>;
```

## 3.9 OCR Module

```typescript
// src/ocr/ocr-engine.ts

interface OCROptions {
  languages: string[];     // ['ind', 'eng']
  psm: number;             // Page segmentation mode
  confidence_threshold: number;
}

interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

async function recognizeText(
  image: Buffer | string,
  options?: OCROptions
): Promise<OCRResult>;
```

## 3.10 Context Rules Engine

```mermaid
flowchart TD
    A["Clipboard Event"] --> B["Identifikasi Source App"]
    B --> C{"Ada rule untuk<br/>source app?"}
    C -->|Ya| D["Load source rule"]
    C -->|Tidak| E["Gunakan default preset"]
    
    D --> F["Apply transformasi"]
    E --> F
    
    F --> G["Ctrl+Alt+V ditekan"]
    G --> H["Identifikasi Target App"]
    H --> I{"Ada rule untuk<br/>target app?"}
    I -->|Ya| J["Apply target rule"]
    I -->|Tidak| K["Paste as-is"]
    J --> K
```

```typescript
// src/core/context-rules.ts

interface ContextRule {
  id: string;
  name: string;
  sourceApp?: string;        // e.g., "AcroRd32.exe"
  targetApp?: string;        // e.g., "Code.exe"
  contentType?: ContentType;
  preset: string;
  transforms: Transform[];
  enabled: boolean;
}

// Contoh aturan bawaan:
const DEFAULT_RULES: ContextRule[] = [
  {
    id: 'pdf-reader-fix',
    name: 'PDF Reader → Fix Line Breaks',
    sourceApp: 'AcroRd32.exe',
    preset: 'pdfFix',
    transforms: ['fixLineBreaks', 'normalizeWhitespace'],
    enabled: true,
  },
  {
    id: 'to-vscode-markdown',
    name: 'Paste ke VS Code → Markdown Table',
    targetApp: 'Code.exe',
    contentType: ContentType.HTML_TABLE,
    preset: 'markdownTable',
    transforms: ['tableToMarkdown'],
    enabled: true,
  },
];
```

---

> **Dokumen selanjutnya:** [04 — Frontend & UI/UX](04-frontend-design.md)
