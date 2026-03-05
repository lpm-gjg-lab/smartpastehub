import { test, expect, type Page } from "@playwright/test";

async function expectMainUsesResponsiveSizing(page: Page) {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) {
      return null;
    }

    return {
      widthStyle: (main as HTMLElement).style.width,
      heightStyle: (main as HTMLElement).style.height,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.widthStyle ?? "").toBe("100%");
  expect(metrics?.heightStyle ?? "").toBe("100%");
}

test.describe("Floating tools UI/UX", () => {
  test("web clipper uses full surface and has close control", async ({
    page,
  }) => {
    await page.goto("/#/web-clipper");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /close window/i }),
    ).toBeVisible();
    await expect(page.locator('input[type="url"]')).toBeVisible();
    await expectMainUsesResponsiveSizing(page);
  });

  test("auto chart is accessible and responsive", async ({ page }) => {
    await page.goto("/#/auto-chart");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByLabel("Paste chart data")).toBeVisible();
    await expect(page.getByRole("button", { name: /close/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /generate chart/i }),
    ).toBeDisabled();
  });

  test("qr bridge exposes labeled controls", async ({ page }) => {
    await page.goto("/#/qr-bridge");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByLabel("Text to encode")).toBeVisible();
    await expect(page.getByLabel("QR size")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /close window/i }),
    ).toBeVisible();
    await expectMainUsesResponsiveSizing(page);
  });

  test("drag and drop zone keeps core actions visible", async ({ page }) => {
    await page.goto("/#/drag-drop-zone");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByLabel("Dropped items")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /close window/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Combine" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();
    await expectMainUsesResponsiveSizing(page);
  });

  test("template form dialog has keyboard-close affordance", async ({
    page,
  }) => {
    await page.goto("/#/template-form");

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /close window/i }),
    ).toBeVisible();
  });

  test("ocr popup dialog renders with close control", async ({ page }) => {
    await page.goto("/#/ocr");

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /close window/i }),
    ).toBeVisible();
  });
});
