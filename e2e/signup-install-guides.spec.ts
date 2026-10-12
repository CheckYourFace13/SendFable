import { test, expect } from "@playwright/test";

const GUIDES = [
  { path: "/integrations/wordpress", name: "WordPress" },
  { path: "/integrations/wix", name: "Wix" },
  { path: "/integrations/webflow", name: "Webflow" },
  { path: "/integrations/squarespace", name: "Squarespace" },
];

for (const guide of GUIDES) {
  test(`${guide.name} install guide is public and uses the live embed`, async ({ page }) => {
    const response = await page.goto(guide.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: `Add a Signup Tool to ${guide.name}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inline installation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Popup installation" })).toBeVisible();
    const html = await page.content();
    expect(html).toContain("https://sendfable.com/embed/form.js");
    expect(html).toContain('data-sendfable-form="your-form"');
    expect(html).toContain('data-display="popup"');
    expect(html).not.toContain("/embed.js");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", new RegExp(`${guide.path}$`));
  });
}

test("integrations hub links the four install guides", async ({ page }) => {
  const response = await page.goto("/integrations");
  expect(response?.status()).toBe(200);
  for (const guide of GUIDES) {
    await expect(page.locator(`a[href="${guide.path}"]`).first()).toBeVisible();
  }
});

test("install guides fit a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const guide of GUIDES) {
    await page.goto(guide.path);
    const wider = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(wider).toBe(false);
  }
});
