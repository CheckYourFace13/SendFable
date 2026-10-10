import { test, expect } from "@playwright/test";

test("hosted DrinkKnird form renders email and does not precheck SMS", async ({ page }) => {
  await page.goto("/f/drinkknird-newsletter");
  await expect(page.getByRole("heading", { name: "DrinkKnird Newsletter" })).toBeVisible();
  await expect(page.getByLabel("Email *")).toBeVisible();
  const sms = page.locator('input[type="checkbox"]');
  if (await sms.count()) {
    await expect(sms.first()).not.toBeChecked();
  }
});

test("public form config and embed script are available cross-origin", async ({ request }) => {
  const config = await request.get("/api/forms/public/drinkknird-newsletter");
  expect(config.ok()).toBeTruthy();
  const body = await config.json();
  expect(body.form.hostedSlug).toBe("drinkknird-newsletter");
  expect(body.token).toBeTruthy();
  const preflight = await request.fetch("/api/forms/submit", { method: "OPTIONS" });
  expect(preflight.status()).toBe(204);
  expect(preflight.headers()["access-control-allow-origin"]).toBeTruthy();
  const script = await request.get("/embed/form.js");
  expect(script.ok()).toBeTruthy();
  const source = await script.text();
  expect(source).toContain("data-sendfable-form");
  expect(source).not.toContain("<iframe");
});
