import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { FloatingWindowShell } from "../../src/renderer/components/FloatingWindowShell";

describe("FloatingWindowShell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("closes window when close button is clicked", () => {
    const closeSpy = vi
      .spyOn(window, "close")
      .mockImplementation(() => undefined);

    const { getByLabelText } = render(
      <FloatingWindowShell title="Tool Window">
        <div>content</div>
      </FloatingWindowShell>,
    );

    fireEvent.click(getByLabelText("Close window"));
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("closes window on Escape key", () => {
    const closeSpy = vi
      .spyOn(window, "close")
      .mockImplementation(() => undefined);

    const { getByRole } = render(
      <FloatingWindowShell title="Tool Window">
        <button type="button">Action</button>
      </FloatingWindowShell>,
    );

    fireEvent.keyDown(getByRole("dialog"), { key: "Escape" });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
