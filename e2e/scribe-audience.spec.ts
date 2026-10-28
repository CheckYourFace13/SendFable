import { expect, test } from "@playwright/test";

test("Scribe stays behind login and does not expose a send control", async ({ page }) => {
  const res = await page.goto("/scribe");
  expect(res?.status()).toBeLessThan(400);
  expect(page.url()).toMatch(/\/(login|signup)/);
});

test("try-builder still suggests Fans as the primary audience", async ({ page }) => {
  await page.goto("/try/signup-tool");
  await page.getByLabel("Business").selectOption("band");
  await expect(page.getByLabel("Audience name")).toHaveValue("Fans");
  await expect(page.getByText("Nothing sends until you choose the date and time.")).toBeVisible();
});
