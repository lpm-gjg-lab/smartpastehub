import { describe, expect, it } from "vitest";
import { applyAutomationTransforms } from "../../src/core/automation-transforms";

describe("automation transforms", () => {
  it("strips UTM tracking params from links", () => {
    const result = applyAutomationTransforms({
      text: "Visit https://example.com?a=1&utm_source=x&utm_medium=y now",
      contentType: "text_with_links",
      targetApp: "chrome.exe",
      enableSmartUrlTransform: true,
      enableLocaleAwareness: false,
      enableIntentFieldDetection: false,
      enableHealthGuard: false,
      enablePrivacyFirewall: false,
    });

    expect(result.text).toContain("https://example.com?a=1");
    expect(result.text).not.toContain("utm_source");
    expect(result.applied).toContain("smart-url-transform");
  });

  it("normalizes locale date/number formatting", () => {
    const result = applyAutomationTransforms({
      text: "Price 10.000 due 2026/02/26",
      contentType: "plain_text",
      targetApp: "notepad.exe",
      enableSmartUrlTransform: false,
      enableLocaleAwareness: true,
      enableIntentFieldDetection: false,
      enableHealthGuard: false,
      enablePrivacyFirewall: false,
    });

    expect(result.text).toContain("10,000");
    expect(result.text).toContain("2026-02-26");
    expect(result.applied).toContain("locale-awareness");
  });

  it("runs health guard and privacy firewall", () => {
    const result = applyAutomationTransforms({
      text: "secret AKIAABCDEFGHIJKLMNOP and bad\u200Bzero-width\uFEFF",
      contentType: "plain_text",
      targetApp: "cmd.exe",
      enableSmartUrlTransform: false,
      enableLocaleAwareness: false,
      enableIntentFieldDetection: true,
      enableHealthGuard: true,
      enablePrivacyFirewall: true,
    });

    expect(result.text).toContain("[REDACTED_SECRET]");
    expect(result.text).not.toContain("AKIAABCDEFGHIJKLMNOP");
    expect(result.text).not.toContain("\u200B");
    expect(result.applied).toContain("health-guard");
    expect(result.applied).toContain("privacy-firewall");
    expect(result.applied).toContain("intent-aware-field-detection");
    expect(result.metadata["fieldIntent"]).toBe("terminal");
  });
});
