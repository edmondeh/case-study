import { expect, test, type Page } from "@playwright/test";

// Runs with a malformed key: the canvas works, Liveblocks refuses the
// connection. Nothing here needs a Liveblocks account or the network.

const image = (page: Page) =>
  page.getByRole("img", { name: "Design mock-up of a product landing page" });
const zoomLevel = (page: Page) => page.getByLabel("Zoom level");

async function percent(page: Page) {
  return Number((await zoomLevel(page).textContent())?.replace("%", ""));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(image(page)).toBeVisible();
});

test("fits the image to the screen and zooms with the controls", async ({
  page,
}) => {
  const fitted = await percent(page);
  expect(fitted).toBeGreaterThan(0);
  expect(fitted).toBeLessThanOrEqual(100);

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(() => percent(page)).toBe(Math.round(fitted * 1.25));

  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect.poll(() => percent(page)).toBeLessThan(fitted);

  await page.getByRole("button", { name: "Fit" }).click();
  await expect.poll(() => percent(page)).toBe(fitted);
});

test("drags the image to pan", async ({ page }) => {
  const before = (await image(page).boundingBox())!;
  const start = {
    x: before.x + before.width / 2,
    y: before.y + before.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 150, start.y - 80, { steps: 5 });
  await page.mouse.up();

  const after = (await image(page).boundingBox())!;
  expect(after.x).toBeCloseTo(before.x - 150, 0);
  expect(after.y).toBeCloseTo(before.y - 80, 0);
  // Panning does not change the zoom level.
  expect(after.width).toBeCloseTo(before.width, 0);
});

test("explains a refused connection and why no comment opens", async ({
  page,
}) => {
  const banner = page.getByRole("alert").filter({
    hasText: "Couldn't connect to the comment server.",
  });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("LIVEBLOCKS_SECRET_KEY");
  await expect(banner.getByRole("button", { name: "Retry" })).toBeVisible();

  // The <img> ignores pointer events (the canvas handles them), so click
  // the spot on screen like a user would rather than the element.
  const box = (await image(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByText("Comments are offline right now")).toBeVisible();
  await expect(page.locator(".lb-floating-composer")).toHaveCount(0);
});

test("offers a retry when the image fails to load", async ({ page }) => {
  await page.goto("/?image=broken");

  await expect(page.getByText("The image could not be loaded.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeDisabled();

  const retried = page.waitForRequest(
    /this-image-does-not-exist\.png\?retry=1/
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await retried;
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
