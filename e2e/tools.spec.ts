import { test, expect } from "@playwright/test";

const TOOLS = [
  "/tools",
  "/tools/email-pricing-calculator",
  "/tools/subject-line-tester",
  "/tools/spam-word-checker",
];

const PHONES = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 393, height: 852 },
];

test("tools hub lists the three tools and does not require login", async ({ page }) => {
  const response = await page.goto("/tools");
  expect(response?.status()).toBe(200);
  expect(page.url()).not.toContain("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Free tools for better email marketing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare costs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check a subject" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check the copy" })).toBeVisible();
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute("href", /\/tools$/);
});

test("subject line tester scores locally and does not send the line", async ({ page }) => {
  const leaked: string[] = [];
  page.on("request", (req) => {
    const blob = `${req.url()} ${req.postData() ?? ""}`;
    if (blob.includes("FREE BEER")) leaked.push(req.url());
  });
  const response = await page.goto("/tools/subject-line-tester");
  expect(response?.status()).toBe(200);
  await page.getByLabel("Subject line").fill("FREE BEER THIS WEEKEND ONLY!!!");
  await expect(page.getByText("Needs a rewrite")).toBeVisible();
  await expect(page.getByText("Not a forecast of opens")).toBeVisible();
  expect(leaked).toEqual([]);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /subject-line-tester$/);
});

test("spam checker explains a phrase is not an automatic block", async ({ page }) => {
  const leaked: string[] = [];
  page.on("request", (req) => {
    const blob = `${req.url()} ${req.postData() ?? ""}`;
    if (blob.toLowerCase().includes("act now")) leaked.push(req.url());
  });
  const response = await page.goto("/tools/spam-word-checker");
  expect(response?.status()).toBe(200);
  await page.getByLabel("Subject line").fill("Act now");
  await page.getByLabel("Email body").fill("Click here for a guaranteed winner!!!");
  await expect(page.getByText("does not mean a filter will reject")).toBeVisible();
  await expect(page.getByText("act now", { exact: false }).first()).toBeVisible();
  expect(leaked).toEqual([]);
});

test("pricing calculator shows a SendFable fit without login", async ({ page }) => {
  const response = await page.goto("/tools/email-pricing-calculator");
  expect(response?.status()).toBe(200);
  expect(page.url()).not.toContain("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Email pricing calculator" })).toBeVisible();
  await expect(page.getByText("SendFable fit")).toBeVisible();
  await expect(page.getByLabel("Contacts")).toBeVisible();
});

for (const phone of PHONES) {
  test(`tools fit ${phone.width}x${phone.height}`, async ({ page }) => {
    await page.setViewportSize(phone);
    for (const path of TOOLS) {
      await page.goto(path);
      const wider = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(wider, path).toBe(false);
    }
  });
}
