import { expect, test } from "@playwright/test";

test("contact form rejects an invalid email before sending", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Contact Sendfable" })).toBeVisible();
  await page.getByLabel("Your email *").fill("not-an-email");
  await page.getByLabel("Message *").fill("This is a real question about my account.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Message received")).toHaveCount(0);
});

test("support API rejects malformed mail and a missing form token", async ({ request }) => {
  for (const email of ["not-an-email", "test@", "@test.com", "user@foo.invalid"]) {
    const res = await request.post("/api/support", {
      data: {
        email,
        topic: "security",
        message: "This message is long enough to pass the length check.",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Enter a valid email address.");
  }

  const missingToken = await request.post("/api/support", {
    data: {
      email: "owner@shop.museum",
      topic: "security",
      message: "This message is long enough to pass the length check.",
    },
  });
  expect(missingToken.status()).toBe(400);
  const tokenBody = await missingToken.json();
  expect(tokenBody.error).toMatch(/refresh the page/i);
});
