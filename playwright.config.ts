import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build (`npm run build` first),
 * served three times with a different Liveblocks key each:
 *
 * - setup:    no key at all, to test the setup instructions.
 * - canvas:   a malformed key. The canvas works but Liveblocks refuses the
 *             connection, so pan/zoom/image and error states are tested
 *             without a Liveblocks account or network.
 * - comments: the real key (from .env.local, or a CI secret), to test real
 *             commenting and real-time sync. Skipped when there is no key.
 */

// Read .env.local the same way Next.js does, to find the real key.
loadEnvConfig(process.cwd());
const realKey = process.env.LIVEBLOCKS_SECRET_KEY || undefined;

const PORTS = { setup: 3201, canvas: 3202, comments: 3203 } as const;
const isCI = Boolean(process.env.CI);

function server(port: number, key: string) {
  return {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
    // An empty string still counts as "set", so Next does not fall back to
    // the value in .env.local.
    env: { LIVEBLOCKS_SECRET_KEY: key },
  };
}

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 800 },
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: "setup.spec.ts",
      use: { baseURL: `http://localhost:${PORTS.setup}` },
    },
    {
      name: "canvas",
      testMatch: "canvas.spec.ts",
      use: { baseURL: `http://localhost:${PORTS.canvas}` },
    },
    ...(realKey
      ? [
          {
            name: "comments",
            testMatch: "comments.spec.ts",
            use: { baseURL: `http://localhost:${PORTS.comments}` },
          },
        ]
      : []),
  ],
  webServer: [
    server(PORTS.setup, ""),
    // Contains a space, which @liveblocks/node rejects before any request.
    server(PORTS.canvas, "sk_not a real key"),
    ...(realKey ? [server(PORTS.comments, realKey)] : []),
  ],
});
