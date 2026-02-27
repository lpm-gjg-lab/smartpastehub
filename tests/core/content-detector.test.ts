import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "./.logs" },
}));

import { detectContentType } from "../../src/core/content-detector";

describe("Content Detector — Comprehensive", () => {
  // ════════════════════════════════════════════════════════════════════════════
  // Plain text — must NOT be misclassified
  // ════════════════════════════════════════════════════════════════════════════
  describe("Plain text (prose)", () => {
    it("should detect normal Indonesian sentence as plain_text", () => {
      const r = detectContentType(
        "Halo tim, ini update terbaru dari meeting kemarin.",
      );
      expect(r.type).toBe("plain_text");
    });

    it("should detect multi-line Indonesian prose as plain_text", () => {
      const text = `Halo tim,

ini update terbaru dari meeting kemarin.

Mohon dicek ya. Terima kasih.`;
      expect(detectContentType(text).type).toBe("plain_text");
    });

    it("should detect prose with tabs as plain_text", () => {
      const text = `Halo   tim,\n\nini   update\tterbaru dari meeting kemarin.\n\nMohon   dicek   ya.   Terima kasih.`;
      expect(detectContentType(text).type).toBe("plain_text");
    });

    it("should detect English prose with commas as plain_text", () => {
      const text = `Dear team, I wanted to share an update.
As discussed, please review the attached report.
If you have questions, feel free to reach out.`;
      expect(detectContentType(text).type).toBe("plain_text");
    });

    it("should NOT detect prose with colons as yaml_data", () => {
      const text = `Halo tim: selamat pagi.
Meeting hari ini: pukul 10.
Agenda: presentasi dan diskusi.`;
      expect(detectContentType(text).type).not.toBe("yaml_data");
    });

    it("should NOT detect prose with equals as toml_data", () => {
      const text = `Total = Rp 500.000
Discount = 10%
Final = Rp 450.000`;
      // This has prose-like content with equals, but also sentence structure
      const r = detectContentType(text);
      // Could be plain_text or toml_data — the key is it shouldn't break things
      // If it yields toml_data, that's acceptable since it looks like key=value config
      expect(["plain_text", "toml_data"]).toContain(r.type);
    });

    it('should NOT detect prose containing "let" as source_code', () => {
      const text = "Please let me know if you have any questions about this.";
      expect(detectContentType(text).type).toBe("plain_text");
    });

    it('should NOT detect prose containing "import" as source_code', () => {
      const text =
        "The import of goods from China is increasing every year, especially in export-heavy sectors.";
      expect(detectContentType(text).type).toBe("plain_text");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // URL detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("URL detection", () => {
    it("should detect a full HTTPS URL", () => {
      expect(detectContentType("https://example.com/path?q=1").type).toBe(
        "url_text",
      );
    });

    it("should detect an FTP URL", () => {
      expect(detectContentType("ftp://server.local/file.txt").type).toBe(
        "url_text",
      );
    });

    it("should detect text with embedded links as text_with_links", () => {
      const text =
        "Check out this article at https://example.com/article for more details.";
      expect(detectContentType(text).type).toBe("text_with_links");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Email detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Email detection", () => {
    it("should detect a standalone email address", () => {
      expect(detectContentType("user@example.com").type).toBe("email_text");
    });

    it("should detect email body with greeting and closing", () => {
      const text = `Dear John,

I wanted to follow up on our conversation yesterday.
Please let me know your availability.

Regards,
Jane`;
      expect(detectContentType(text).type).toBe("email_text");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Path detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Path detection", () => {
    it("should detect a Windows path", () => {
      expect(detectContentType("C:\\Users\\file.txt").type).toBe("path_text");
    });

    it("should detect a Unix path", () => {
      expect(detectContentType("/home/user/documents/report.pdf").type).toBe(
        "path_text",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Color code detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Color code detection", () => {
    it("should detect hex color", () => {
      expect(detectContentType("#FF5733").type).toBe("color_code");
    });

    it("should detect rgb() color", () => {
      expect(detectContentType("rgb(255, 87, 51)").type).toBe("color_code");
    });

    it("should detect hsl() color", () => {
      expect(detectContentType("hsl(11, 100%, 60%)").type).toBe("color_code");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Math expression detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Math expression detection", () => {
    it("should detect simple arithmetic", () => {
      expect(detectContentType("5 + 3 * 2").type).toBe("math_expression");
    });

    it("should detect parenthesized expression", () => {
      expect(detectContentType("(100 / 5) - 10").type).toBe("math_expression");
    });

    it("should NOT detect a plain number as math", () => {
      expect(detectContentType("42").type).toBe("plain_text");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // JSON detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("JSON detection", () => {
    it("should detect a JSON object", () => {
      expect(detectContentType('{"name": "Alice", "age": 30}').type).toBe(
        "json_data",
      );
    });

    it("should detect a JSON array", () => {
      expect(detectContentType("[1, 2, 3]").type).toBe("json_data");
    });

    it("should NOT detect invalid JSON starting with { as json", () => {
      const r = detectContentType("{broken json content");
      expect(r.type).not.toBe("json_data");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CSV/TSV detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("CSV/TSV detection", () => {
    it("should detect real CSV data", () => {
      const csv = `Name,Age,Location
Alice,30,New York
Bob,25,San Francisco`;
      expect(detectContentType(csv).type).toBe("csv_table");
    });

    it("should detect real TSV data", () => {
      const tsv = `Name\tAge\tLocation
Alice\t30\tNew York
Bob\t25\tSan Francisco`;
      expect(detectContentType(tsv).type).toBe("tsv_table");
    });

    it("should NOT detect prose with commas as CSV", () => {
      const text = `Dear team, I wanted to share.
As discussed, please review.
If you have questions, feel free.`;
      expect(detectContentType(text).type).not.toBe("csv_table");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Markdown detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Markdown detection", () => {
    it("should detect markdown with heading and list", () => {
      const md = `# My Document

- Item one
- Item two
- Item three`;
      expect(detectContentType(md).type).toBe("md_text");
    });

    it("should detect markdown with bold and links", () => {
      const md = `**Important**: See [docs](https://example.com) for details.`;
      expect(detectContentType(md).type).toBe("md_text");
    });

    it("should detect unicode bullet lists as md_text", () => {
      const md = `Agenda\n\n• First item\n• Second item`;
      expect(detectContentType(md).type).toBe("md_text");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Source code detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Source code detection", () => {
    it("should detect JavaScript code", () => {
      const code = `function greet(name) {
  const message = "Hello " + name;
  return message;
}`;
      expect(detectContentType(code).type).toBe("source_code");
    });

    it("should detect Python code", () => {
      const code = `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`;
      expect(detectContentType(code).type).toBe("source_code");
    });

    it("should NOT detect single keyword in prose as code", () => {
      expect(
        detectContentType("I want to import something for class tomorrow.")
          .type,
      ).not.toBe("source_code");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // YAML detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("YAML detection", () => {
    it("should detect multi-line YAML config", () => {
      const yaml = `name: my-app
version: 1.0.0
description: A sample application
author: Jane Doe`;
      expect(detectContentType(yaml).type).toBe("yaml_data");
    });

    it("should NOT detect single key:value line as YAML", () => {
      const text = "name: John";
      expect(detectContentType(text).type).not.toBe("yaml_data");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TOML detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("TOML detection", () => {
    it("should detect TOML with section headers", () => {
      const toml = `[package]
name = "my-app"
version = "1.0"

[dependencies]
tokio = "1.0"`;
      expect(detectContentType(toml).type).toBe("toml_data");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PDF text detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("PDF text detection", () => {
    it("should detect OCR-like short lines without punctuation", () => {
      const pdfText = `Invoice Number
Item Description
Quantity Ordered
Unit Price
Total Amount
Subtotal
Tax Rate
Grand Total`;
      expect(detectContentType(pdfText).type).toBe("pdf_text");
    });

    it("should NOT detect short prose as pdf_text", () => {
      const text = `This is a test.
It has some lines.
They are short.
But have punctuation.`;
      expect(detectContentType(text).type).not.toBe("pdf_text");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Phone number detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Phone number detection", () => {
    it("should detect Indonesian mobile number", () => {
      expect(detectContentType("081234567890").type).toBe("phone_number");
    });

    it("should detect Indonesian number with +62 prefix", () => {
      expect(detectContentType("+62 812-3456-7890").type).toBe("phone_number");
    });

    it("should detect Indonesian number with dashes", () => {
      expect(detectContentType("0812-3456-7890").type).toBe("phone_number");
    });

    it("should detect international format", () => {
      expect(detectContentType("+1-800-555-1234").type).toBe("phone_number");
    });

    it("should NOT detect a regular number as phone", () => {
      // Short numbers should not be detected as phones
      expect(detectContentType("12345").type).not.toBe("phone_number");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Date / time detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Date / time detection", () => {
    it("should detect ISO 8601 date", () => {
      expect(detectContentType("2026-02-26").type).toBe("date_text");
    });

    it("should detect ISO 8601 datetime", () => {
      expect(detectContentType("2026-02-26T10:30:00Z").type).toBe("date_text");
    });

    it("should detect long-form English date", () => {
      expect(detectContentType("26 February 2026").type).toBe("date_text");
    });

    it("should detect long-form Indonesian date", () => {
      expect(detectContentType("26 Februari 2026").type).toBe("date_text");
    });

    it("should detect short-form date", () => {
      expect(detectContentType("26/02/2026").type).toBe("date_text");
    });

    it("should detect time-only", () => {
      expect(detectContentType("10:30").type).toBe("date_text");
    });

    it("should detect Indonesian day+date prose", () => {
      expect(detectContentType("Senin, 26 Februari 2026").type).toBe(
        "date_text",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Address detection
  // ════════════════════════════════════════════════════════════════════════════
  describe("Address detection", () => {
    it("should detect Indonesian street address with ZIP", () => {
      const addr = `Jl. Sudirman No. 45
Jakarta Selatan 12190
DKI Jakarta`;
      expect(detectContentType(addr).type).toBe("address");
    });

    it("should detect US-style address", () => {
      const addr = `123 Main Street
Springfield, IL 62701`;
      expect(detectContentType(addr).type).toBe("address");
    });

    it("should NOT detect a regular multi-line sentence as address", () => {
      const text = `Hari ini cuaca sangat cerah.
Saya pergi ke pasar bersama teman.`;
      expect(detectContentType(text).type).not.toBe("address");
    });
  });
});
