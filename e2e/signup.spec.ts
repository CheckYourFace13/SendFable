import { expect, test } from "@playwright/test";

test("signup first screen is one H1 with email, password, and terms", async ({ page }) => {
  const res = await page.goto("/signup");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toHaveCount(1);
  await expect(page.getByLabel(/^email$/i)).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator("#accept-policies")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
  await expect(page.locator("#name")).toHaveCount(0);
  await expect(page.locator("#workspace")).toHaveCount(0);
});

test("login page still accepts an existing account", async ({ page }) => {
  const res = await page.goto("/login");
  expect(res?.status()).toBe(200);
  await expect(page.getByLabel(/^email$/i).first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
