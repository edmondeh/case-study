import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests only; e2e/*.spec.ts are Playwright tests.
    include: ["src/**/*.test.ts"],
  },
});
