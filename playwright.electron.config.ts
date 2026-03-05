import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "electron.spec.ts",
  timeout: 60_000,
  use: {
    headless: true,
  },
});
