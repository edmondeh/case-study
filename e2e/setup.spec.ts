import { expect, test } from "@playwright/test";

test("shows setup steps instead of the app when the key is missing", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Add a Liveblocks key to start commenting",
    })
  ).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.locator(".canvas")).toHaveCount(0);
});
