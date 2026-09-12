/**
 * Customer SMS setup UX — email-only never forced; Text/Both get soft CTA when enabled.
 * Provider branding must not appear on public/auth surfaces.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://sendfable.com";

test.describe("Customer SMS setup visibility", () => {
  test("email-only signup shows no SMS registration wizard", async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByText(/text messaging setup|submit for text messaging|10DLC|Telnyx|TCR/i)).toHaveCount(0);
    await expect(page.getByLabel(/phone|mobile/i)).toHaveCount(0);
  });

  test("text messaging settings requires auth (not public)", async ({ page }) => {
    await page.goto(`${BASE}/settings/text-messaging`);
    await expect(page).toHaveURL(/login|signin/i);
  });

  test("admin SMS diagnostics requires auth", async ({ page }) => {
    await page.goto(`${BASE}/admin/sms/setup`);
    await expect(page).toHaveURL(/login|signin/i);
  });

  test("public marketing does not expose Telnyx branding", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByText(/Telnyx|campaignBuilder|10DLC/i)).toHaveCount(0);
    await page.goto(`${BASE}/pricing`);
    await expect(page.getByText(/Telnyx|campaignBuilder/i)).toHaveCount(0);
  });

  test("new campaign channel gate redirects to login when unauthenticated", async ({ page }) => {
    await page.goto(`${BASE}/campaigns/new`);
    await expect(page).toHaveURL(/login|signin/i);
  });
});
