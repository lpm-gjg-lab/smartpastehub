import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyThemeToRoot,
  emitThemeChanged,
  normalizeTheme,
} from "../../src/renderer/lib/theme-sync";

describe("renderer theme sync", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.body.removeAttribute("data-theme");
    localStorage.clear();
  });

  it("normalizes unsupported values to dark", () => {
    expect(normalizeTheme("system")).toBe("dark");
    expect(normalizeTheme(undefined)).toBe("dark");
  });

  it("applies light theme consistently to html/body and localStorage", () => {
    const applied = applyThemeToRoot("light");

    expect(applied).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.body.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("keeps dark as stable fallback for non-light values", () => {
    const applied = applyThemeToRoot("dark");

    expect(applied).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("emits app:theme-changed with normalized detail", () => {
    const handler = vi.fn();
    window.addEventListener("app:theme-changed", handler);

    emitThemeChanged("light");

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent<{ theme: string }>;
    expect(event.detail.theme).toBe("light");
    window.removeEventListener("app:theme-changed", handler);
  });
});
