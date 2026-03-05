import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { GeneralSettings } from "../../src/renderer/components/settings/GeneralSettings";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";
import type { AppSettings } from "../../src/shared/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("GeneralSettings language selector", () => {
  it("renders language selector and updates general.language", () => {
    const settings: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    const updateSetting = vi.fn<
      (path: string, value: unknown) => Promise<void>
    >(() => Promise.resolve());

    const { getByLabelText } = render(
      <GeneralSettings
        settings={settings}
        showOnboarding={false}
        setShowOnboarding={vi.fn()}
        resolveHotkeyInputValue={() => "Ctrl+Alt+V"}
        updateSetting={updateSetting}
      />,
    );

    const languageSelect = getByLabelText(
      "settings.language",
    ) as HTMLSelectElement;
    fireEvent.change(languageSelect, { target: { value: "id" } });

    expect(updateSetting).toHaveBeenCalledWith("general.language", "id");
  });
});
