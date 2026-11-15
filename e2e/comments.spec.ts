import { expect, test, type Page } from "@playwright/test";

// Runs against real Liveblocks (only when a key is available). Every test
// uses its own empty room via ?room=, so runs never see each other's
// comments or the demo room's.

function newRoom(name: string) {
  return `e2e-${name}-${Date.now().toString(36)}`;
}

async function openRoom(page: Page, room: string) {
  await page.goto(`/?room=${room}`);
  await expect(page.locator(".canvas")).toHaveAttribute(
    "data-connection",
    "connected",
    { timeout: 20_000 }
  );
}

const image = (page: Page) =>
  page.getByRole("img", { name: "Design mock-up of a product landing page" });

/** Clicks the image at a fraction (0..1) of its width and height. */
async function clickImageAt(page: Page, fx: number, fy: number) {
  const box = (await image(page).boundingBox())!;
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

/** Where a pin's anchor (its top-left corner) is, as a fraction of the image. */
async function pinAnchor(page: Page) {
  const pin = (await page.locator(".pin").first().boundingBox())!;
  const box = (await image(page).boundingBox())!;
  return {
    x: (pin.x - box.x) / box.width,
    y: (pin.y - box.y) / box.height,
  };
}

async function postComment(page: Page, text: string) {
  const composer = page.locator(".lb-floating-composer");
  const editor = composer.locator('[contenteditable="true"]');
  await expect(editor).toBeFocused();
  // The Liveblocks editor (Slate) needs real key presses, one at a time.
  await editor.pressSequentially(text, { delay: 20 });
  await expect(editor).toContainText(text);

  // The thread shows up immediately (optimistic update); wait for Liveblocks
  // to confirm it was saved as well.
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/rooms\/[^/]+\/threads$/.test(new URL(response.url()).pathname)
  );
  await composer.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".lb-floating-thread")).toContainText(text);
  expect((await saved).ok()).toBe(true);
}

test("posts a comment that stays on its spot through zoom and reload", async ({
  page,
}) => {
  await openRoom(page, newRoom("anchor"));

  await clickImageAt(page, 0.3, 0.4);
  await postComment(page, "Make this headline shorter");

  const placed = await pinAnchor(page);
  expect(placed.x).toBeCloseTo(0.3, 2);
  expect(placed.y).toBeCloseTo(0.4, 2);

  // Close the thread, then zoom in twice: the pin must not drift.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  const zoomed = await pinAnchor(page);
  expect(zoomed.x).toBeCloseTo(0.3, 2);
  expect(zoomed.y).toBeCloseTo(0.4, 2);

  // It was saved, not just shown: reload and wait for it to load again.
  await page.reload();
  await expect(page.locator(".canvas")).toHaveAttribute(
    "data-connection",
    "connected",
    { timeout: 20_000 }
  );
  await expect(page.locator(".pin")).toHaveCount(1, { timeout: 15_000 });
});

test("opens threads inwards near the right edge of the image", async ({
  page,
}) => {
  await openRoom(page, newRoom("flip"));

  await clickImageAt(page, 0.2, 0.5);
  await expect(page.locator("[data-side]").first()).toHaveAttribute(
    "data-side",
    "right"
  );
  await page.keyboard.press("Escape");

  await clickImageAt(page, 0.95, 0.5);
  await expect(page.locator("[data-side]").first()).toHaveAttribute(
    "data-side",
    "left"
  );
});

test("shows a new comment to another user in real time", async ({
  browser,
}) => {
  const room = newRoom("sync");
  // Two browser contexts have separate cookies, so two different users.
  const alice = await (await browser.newContext()).newPage();
  const bob = await (await browser.newContext()).newPage();
  await openRoom(alice, room);
  await openRoom(bob, room);
  await expect(bob.locator(".pin")).toHaveCount(0);

  await clickImageAt(alice, 0.5, 0.5);
  await postComment(alice, "Hello from another window");

  await expect(bob.locator(".pin")).toHaveCount(1, { timeout: 10_000 });
  await bob.locator(".pin").click();
  await expect(bob.locator(".lb-floating-thread")).toContainText(
    "Hello from another window"
  );
});
