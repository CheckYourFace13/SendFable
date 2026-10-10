import { test, expect } from "@playwright/test";

test.describe("Marketing Autopilot public surfaces", () => {
  test("feature page renders core promise", async ({ page }) => {
    await page.goto("/automated-email-marketing");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Automated email marketing/i
    );
    await expect(page.getByText(/No approval\. No send/i).first()).toBeVisible();
    await expect(page.getByText(/Scribe/i).first()).toBeVisible();
  });

  test("homepage includes Autopilot section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#marketing-autopilot")).toBeVisible();
    await expect(page.locator("#marketing-autopilot")).toContainText(
      /Your website changes/i
    );
    await expect(page.locator("#marketing-autopilot")).toContainText(
      /Nothing sends until you schedule it/i
    );
    await expect(page.locator("#marketing-autopilot")).toContainText(
      /3 months/i
    );
  });

  test("homepage autopilot section fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const section = page.locator("#marketing-autopilot");
    await expect(section).toBeVisible();
    await expect(section).toContainText(/You choose when it sends/i);
    const box = await section.boundingBox();
    expect(box && box.width).toBeLessThanOrEqual(390);
  });
});
