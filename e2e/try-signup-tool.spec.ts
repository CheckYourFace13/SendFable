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
  const res = await page.goto("/try/signup-tool");
  expect(res?.status()).toBe(200);
  expect(page.url()).not.toContain("/login");
  await expect(page.getByRole("heading", { name: "Build your signup tool" })).toBeVisible();
  await page.getByLabel("Business").selectOption("band");
  await expect(page.getByLabel("Audience name")).toHaveValue("Fans");
  await expect(page.getByText("Your Fans list")).toBeVisible();
  await expect(page.getByRole("link", { name: "Use this on my website" })).toBeVisible();
  await expect(page.getByText("Nothing sends until you choose the date and time.")).toBeVisible();
  expect(posted).toEqual([]);
});

test("try builder activate link goes to free signup", async ({ page }) => {
  await page.goto("/try/signup-tool");
  const href = await page.getByRole("link", { name: "Use this on my website" }).getAttribute("href");
  expect(href).toMatch(/^\/signup/);
});

test("try builder fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/try/signup-tool");
  const wider = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(wider).toBe(false);
});
