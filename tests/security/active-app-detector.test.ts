import { describe, expect, it } from "vitest";
import { classifyAppType } from "../../src/security/active-app-detector";

describe("active app detector classifier", () => {
  it("classifies spreadsheet and knowledge apps as editor bucket", () => {
    expect(classifyAppType("EXCEL.EXE")).toBe("editor");
    expect(classifyAppType("obsidian.exe")).toBe("editor");
  });

  it("keeps browser and chat app classification stable", () => {
    expect(classifyAppType("chrome.exe")).toBe("browser");
    expect(classifyAppType("slack.exe")).toBe("chat");
  });
});
