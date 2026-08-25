/**
 * Minimal Playwright E2E for launch certification.
 * Public + auth-gate checks against BASE_URL (default production).
 * Does NOT send email, charge Stripe, or enable SMS.
 */
import { test, expect, devices } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://sendfable.com";

test.describe("PUBLIC marketing", () => {
  test("homepage communicates product and CTA", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start writing free/i }).first()).toBeVisible();
    await expect(page.getByText(/500 contacts/i).first()).toBeVisible();
    await expect(page.getByText(/Create beautiful campaigns, reach the right people/i)).toHaveCount(0);
  });

  test("pricing shows Free and Starter $12", async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/\$12/)).toBeVisible();
    await expect(page.getByText(/1,?000/)).toBeVisible();
  });

  test("signup page loads Start Free path", async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.locator("form").first()).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test("solutions hub is live", async ({ page }) => {
    await page.goto(`${BASE}/solutions`);
    await expect(page.getByRole("heading", { name: /Email marketing by industry/i })).toBeVisible();
  });
});

test.describe("AUTH gates", () => {
  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("contacts redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`${BASE}/contacts`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup form exposes email, password, and policy controls", async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /create|start|sign up|continue/i }).first()).toBeVisible();
  });
});

test.describe("SMS remains dark", () => {
  test("public /sms is not a customer product page", async ({ page }) => {
    const res = await page.goto(`${BASE}/sms`);
    expect(res?.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("MOBILE homepage", () => {
  test("homepage CTA visible on phone", async ({ page }) => {
    await page.setViewportSize(devices["iPhone 13"].viewport!);
    await page.goto(`${BASE}/`);
    await expect(page.getByRole("link", { name: /Start writing free/i }).first()).toBeVisible();
  });

  test("signup usable on phone", async ({ page }) => {
    await page.setViewportSize(devices["iPhone 13"].viewport!);
    await page.goto(`${BASE}/signup`);
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });
});
