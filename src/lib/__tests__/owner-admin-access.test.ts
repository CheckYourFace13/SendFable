import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { safeCallbackPath } from "@/lib/safe-redirect";
import {
  OWNER_ADMIN_HOME,
  adminRouteAccess,
  internalWorkspaceHealth,
  ownerAdminFooterVisible,
} from "@/lib/owner-admin-access";

function src(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("owner admin footer visibility", () => {
  it("shows the Admin link only for OWNER_ADMIN", () => {
    assert.equal(ownerAdminFooterVisible("OWNER_ADMIN"), true);
    assert.equal(ownerAdminFooterVisible("NONE"), false);
    assert.equal(ownerAdminFooterVisible("ADMIN"), false);
    assert.equal(ownerAdminFooterVisible(""), false);
    assert.equal(ownerAdminFooterVisible(null), false);
    assert.equal(ownerAdminFooterVisible(undefined), false);
  });

  it("points the owner link at the internal workspace landing page", () => {
    assert.equal(OWNER_ADMIN_HOME, "/admin/internal");
    assert.equal(safeCallbackPath("/admin/internal"), "/admin/internal");
  });

  it("renders the app footer link only when the server says the user is the owner", () => {
    const layout = src("src/app/(app)/layout.tsx");
    assert.match(layout, /const ownerAdmin = await isOwnerAdminUser\(user\)/);
    assert.match(layout, /\{ownerAdmin && \([\s\S]*href=\{OWNER_ADMIN_HOME\}[\s\S]*data-testid="owner-admin-link"[\s\S]*Admin[\s\S]*\)\}/);
    const sidebar = src("src/components/app/sidebar-nav.tsx");
    assert.equal(sidebar.includes('href: "/admin"'), false);
    assert.equal(sidebar.includes("Admin"), false);
    const marketing = src("src/components/marketing/site-footer.tsx");
    assert.equal(marketing.includes("/admin"), false);
    assert.equal(marketing.includes(">Admin<"), false);
  });
});

describe("owner admin route access", () => {
  it("sends logged-out visitors to normal login", () => {
    assert.equal(
      adminRouteAccess({ authenticated: false, platformRole: null }),
      "redirect_login"
    );
    assert.equal(
      adminRouteAccess({ authenticated: false, platformRole: "OWNER_ADMIN" }),
      "redirect_login"
    );
  });

  it("denies a normal signed-in customer", () => {
    assert.equal(
      adminRouteAccess({ authenticated: true, platformRole: "NONE" }),
      "deny"
    );
  });

  it("allows only OWNER_ADMIN", () => {
    assert.equal(
      adminRouteAccess({ authenticated: true, platformRole: "OWNER_ADMIN" }),
      "allow"
    );
  });

  it("gates every /admin page on the server and keeps logged-out /admin on the login redirect", () => {
    const layout = src("src/app/(app)/admin/layout.tsx");
    assert.match(layout, /requireOwnerAdminUser\(\)/);
    assert.match(layout, /redirect\("\/dashboard"\)/);
    const middleware = src("src/middleware.ts");
    assert.match(middleware, /"\/admin"/);
    assert.match(middleware, /callbackUrl/);
    const viewAs = src("src/app/api/admin/view-as/route.ts");
    assert.match(viewAs, /if \(!ws\.isInternal\)/);
    assert.match(viewAs, /admin\.view_as\.entered/);
    assert.match(viewAs, /admin\.view_as\.exited/);
    assert.match(viewAs, /requireOwnerAdminUser\(\)/);
  });

  it("does not accept a client-supplied platform role", () => {
    const apiRoot = join(process.cwd(), "src", "app", "api");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) files.push(full);
      }
    };
    walk(apiRoot);
    const writers = files.filter((file) => /platformRole\s*:/.test(readFileSync(file, "utf8")));
    assert.deepEqual(writers, []);
    const banner = src("src/components/app/admin-view-banner.tsx");
    assert.match(banner, /Admin viewing/);
    assert.match(banner, /Exit Admin View/);
    assert.match(banner, /\/api\/admin\/view-as/);
  });
});

describe("internal workspace health", () => {
  it("is OK when the workspace can send and has no failures", () => {
    assert.deepEqual(
      internalWorkspaceHealth({
        disabled: false,
        sendingStatus: "VERIFIED",
        openIssues: 0,
        failedCampaigns: 0,
      }),
      { ok: true, label: "OK" }
    );
  });

  it("lists disablement, sender, failures, and notes", () => {
    const health = internalWorkspaceHealth({
      disabled: true,
      sendingStatus: "PENDING",
      openIssues: 2,
      failedCampaigns: 1,
    });
    assert.equal(health.ok, false);
    assert.match(health.label, /Disabled/);
    assert.match(health.label, /Sender PENDING/);
    assert.match(health.label, /1 failed campaign/);
    assert.match(health.label, /2 notes/);
  });
});
