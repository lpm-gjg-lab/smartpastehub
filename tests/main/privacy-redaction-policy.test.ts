import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";
import { resolvePrivacyRedactionMode } from "../../src/main/privacy-redaction-policy";
import type { AppSettings } from "../../src/shared/types";

function cloneDefaultSettings(): AppSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
}

function withPrivacy(
  patch: Partial<NonNullable<AppSettings["privacy"]>>,
): AppSettings {
  const base = cloneDefaultSettings();
  return {
    ...base,
    privacy: {
      ...(base.privacy as NonNullable<AppSettings["privacy"]>),
      ...patch,
    },
  };
}

describe("privacy redaction policy", () => {
  it("uses global fallback mode when no app-specific rule matches", () => {
    const settings = withPrivacy({
      firewallRedactionMode: "display_only",
      autoMutateOnPublicApps: false,
      mutateClipboardApps: [],
    });

    expect(resolvePrivacyRedactionMode(settings, "notepad.exe")).toBe(
      "display_only",
    );
  });

  it("forces mutate mode when app is in explicit override list", () => {
    const settings = withPrivacy({
      firewallRedactionMode: "display_only",
      autoMutateOnPublicApps: false,
      mutateClipboardApps: ["slack", "discord"],
    });

    expect(resolvePrivacyRedactionMode(settings, "Slack.exe")).toBe(
      "mutate_clipboard",
    );
  });

  it("forces mutate mode for public apps when strict mode enabled", () => {
    const settings = withPrivacy({
      firewallRedactionMode: "display_only",
      autoMutateOnPublicApps: true,
      mutateClipboardApps: [],
    });

    expect(resolvePrivacyRedactionMode(settings, "chrome.exe")).toBe(
      "mutate_clipboard",
    );
    expect(resolvePrivacyRedactionMode(settings, "Discord")).toBe(
      "mutate_clipboard",
    );
  });

  it("keeps fallback mode for public apps when strict mode disabled", () => {
    const settings = withPrivacy({
      firewallRedactionMode: "display_only",
      autoMutateOnPublicApps: false,
      mutateClipboardApps: [],
    });

    expect(resolvePrivacyRedactionMode(settings, "chrome.exe")).toBe(
      "display_only",
    );
  });

  it("respects mutate fallback when globally configured", () => {
    const settings = withPrivacy({
      firewallRedactionMode: "mutate_clipboard",
      autoMutateOnPublicApps: false,
      mutateClipboardApps: [],
    });

    expect(resolvePrivacyRedactionMode(settings, "notepad.exe")).toBe(
      "mutate_clipboard",
    );
  });
});
