import { test, expect } from "@playwright/test";

test.describe("Marketing Autopilot public surfaces", () => {
  test("feature page renders core promise", async ({ page }) => {
    await page.goto("/automated-email-marketing");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Automated email marketing/i
    );
    await expect(page.getByText(/No approval\. No send/i).first()).toBeVisible();
    await expect(page.getByText(/Marketing Autopilot/i).first()).toBeVisible();
  });

  test("homepage includes Autopilot section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#marketing-autopilot")).toBeVisible();
    await expect(page.locator("#marketing-autopilot")).toContainText(
      /Your website changes/i
    );
  });
});
