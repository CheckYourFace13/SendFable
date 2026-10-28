import { expect, test } from "@playwright/test";

test("public try builder does not require an account and does not collect emails", async ({
  page,
}) => {
  const posted: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/api/forms/submit")) {
      posted.push(req.url());
    }
  });
  const res = await page.goto("/try/signup-tool?type=band");
  expect(res?.status()).toBe(200);
  expect(page.url()).not.toContain("/login");
  await expect(page.getByRole("heading", { name: "See it working." })).toBeVisible();
  await expect(page.getByText("Start writing free")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pricing" })).toHaveCount(0);
  await page.getByLabel("Business type").selectOption("band");
  await expect(page.getByLabel("Audience name")).toHaveValue("Fans");
  await expect(page.getByText("Join the fan list").first()).toBeVisible();
  await page.getByLabel("Email").fill("chris@example.com");
  await page.getByRole("button", { name: "Join the fan list" }).click();
  await expect(page.getByText("✓ Added to Fans")).toBeVisible();
  await expect(page.getByText("That's what your visitors will see.")).toBeVisible();
  await expect(page.getByText("Fans — 1 subscriber")).toBeVisible();
  await expect(page.getByText("Venues — 0 subscribers")).toBeVisible();
  await expect(page.getByRole("link", { name: "MAKE THIS LIVE — FREE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "WordPress" })).toBeVisible();
  await expect(page.getByText("Your code will be ready when you make this signup live.")).toBeVisible();
  await expect(page.getByText("Preview only")).toHaveCount(0);
  expect(posted).toEqual([]);
});

test("try builder make-live link goes to free signup", async ({ page }) => {
  await page.goto("/try/signup-tool");
  const href = await page.getByRole("link", { name: "MAKE THIS LIVE — FREE" }).getAttribute("href");
  expect(href).toMatch(/^\/signup/);
  expect(href).toMatch(/try=/);
  expect(href).toMatch(/type=/);
});

test("try-builder signup is email, password, and terms only", async ({ page }) => {
  await page.goto("/try/signup-tool?type=band");
  await page.getByRole("link", { name: "MAKE THIS LIVE — FREE" }).click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByLabel(/^email$/i)).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByLabel(/your name/i)).toHaveCount(0);
  await expect(page.getByLabel(/business or project name/i)).toHaveCount(0);
  expect(page.url()).toMatch(/try=/);
});

test("try builder can switch inline and popup without an account", async ({ page }) => {
  await page.goto("/try/signup-tool?type=band");
  await page.getByRole("button", { name: "Popup" }).click();
  await expect(page.getByRole("button", { name: "Open signup" })).toBeVisible();
  await page.getByRole("button", { name: "Open signup" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.getByRole("button", { name: "Inline" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
});

for (const size of [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 393, height: 852 },
]) {
  test(`try builder fits ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/try/signup-tool?type=band");
    await expect(page.getByRole("heading", { name: "See it working." })).toBeVisible();
    const wider = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(wider).toBe(false);
  });
}
