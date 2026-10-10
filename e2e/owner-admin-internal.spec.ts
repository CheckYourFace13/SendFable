import { test, expect } from "@playwright/test";

test.describe("Owner admin console gates", () => {
  test("unauthenticated /admin/internal redirects to login", async ({ page }) => {
    await page.goto("/admin/internal");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /admin/workspaces redirects to login", async ({ page }) => {
    await page.goto("/admin/workspaces");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated admin view-as API is forbidden/unauthorized", async ({ request }) => {
    const res = await request.post("/api/admin/view-as", {
      data: { workspaceId: "not-a-real-id" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("unauthenticated internal workspaces API is forbidden/unauthorized", async ({ request }) => {
    const res = await request.get("/api/admin/internal-workspaces");
    expect([401, 403]).toContain(res.status());
  });
});
