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
      text: "secret AKIAABCDEFGHIJKLMNOP and bad\u200Bzero-width",
      contentType: "plain_text",
      enableSmartUrlTransform: false,
      enableLocaleAwareness: false,
      enableIntentFieldDetection: false,
      enableHealthGuard: true,
      enablePrivacyFirewall: true,
    });

    // Default firewall mode is display-only: preview is redacted.
    expect(result.displayText || result.text).toContain("[REDACTED_SECRET]");
    expect(result.displayText || result.text).not.toContain(
      "AKIAABCDEFGHIJKLMNOP",
    );
    expect(result.text).not.toContain("\u200B");
    expect(result.applied).toContain("privacy-firewall");
    expect(result.applied).toContain("health-guard");
  });

  it("keeps clipboard value and redacts preview in display-only mode", () => {
    const input = "my key is sk-12345678901234567890123";

    const result = applyAutomationTransforms({
      text: input,
      contentType: "plain_text",
      targetApp: "slack.exe",
      enableSmartUrlTransform: false,
      enableLocaleAwareness: false,
      enableIntentFieldDetection: false,
      enableHealthGuard: false,
      enablePrivacyFirewall: true,
      privacyRedactionMode: "display_only",
    });

    expect(result.text).toContain("sk-12345678901234567890123");
    expect(result.displayText).toContain("[REDACTED_SECRET]");
  });

  it("redacts clipboard value in mutate_clipboard mode", () => {
    const input = "my key is sk-12345678901234567890123";

    const result = applyAutomationTransforms({
      text: input,
      contentType: "plain_text",
      targetApp: "Code.exe",
      enableSmartUrlTransform: false,
      enableLocaleAwareness: false,
      enableIntentFieldDetection: false,
      enableHealthGuard: false,
      enablePrivacyFirewall: true,
      privacyRedactionMode: "mutate_clipboard",
    });

    expect(result.text).toContain("[REDACTED_SECRET]");
    expect(result.text).not.toContain("sk-123456");
  });

  it("detects query/search and body-style field intents", () => {
    const queryResult = applyAutomationTransforms({
      text: "SELECT * FROM users WHERE active = 1",
      contentType: "plain_text",
      targetApp: "notion.exe",
      enableSmartUrlTransform: false,
      enableLocaleAwareness: false,
      enableIntentFieldDetection: true,
      enableHealthGuard: false,
      enablePrivacyFirewall: false,
    });

    const bodyResult = applyAutomationTransforms({
      text: "Line one\nLine two\nLine three\nLine four\nLine five",
      contentType: "plain_text",
      targetApp: "notion.exe",
      enableSmartUrlTransform: false,
      enableLocaleAwareness: false,
      enableIntentFieldDetection: true,
      enableHealthGuard: false,
      enablePrivacyFirewall: false,
    });

    expect(queryResult.metadata["fieldIntent"]).toBe("query_input");
    expect(bodyResult.metadata["fieldIntent"]).toBe("editor_body");
  });
});
