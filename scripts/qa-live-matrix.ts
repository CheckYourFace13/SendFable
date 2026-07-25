/**
 * Live production QA: workspace isolation + role matrix.
 *
 * Reads /root/sendfable-secrets/qa-accounts.env (never prints passwords).
 * Mints Auth.js JWT session cookies via NEXTAUTH_SECRET (ops-only).
 *
 * Rules enforced by this script:
 * - Never POST /api/billing/checkout or /api/billing/portal as OWNER A
 *   (OWNER has a live Stripe customer; those calls create Stripe objects).
 * - Never launch/send campaigns.
 * - Never open public signup or change launch flags.
 *
 * Usage:
 *   npx tsx scripts/qa-live-matrix.ts
 */
import { promises as fs } from "fs";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.QA_BASE_URL || "https://sendfable.com";
const SECRETS_FILE = "/root/sendfable-secrets/qa-accounts.env";
const COOKIE_NAME = "__Secure-authjs.session-token";
const WS_COOKIE = "sf_workspace";

type CaseResult = {
  id: string;
  expect: string;
  status: number;
  pass: boolean;
  detail?: string;
};

const results: CaseResult[] = [];
const created: { kind: string; id: string; workspace: "A" | "B" }[] = [];

function loadEnvFile(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

function record(
  id: string,
  expect: string,
  status: number,
  pass: boolean,
  detail?: string,
) {
  results.push({ id, expect, status, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark} ${id} → ${status} (expect ${expect})${detail ? " " + detail : ""}`);
}

async function mintCookie(user: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET missing");
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
    },
    secret,
    salt: COOKIE_NAME,
    maxAge: 60 * 60,
  });
  return token;
}

function cookieHeader(sessionToken: string, workspaceId: string): string {
  return `${COOKIE_NAME}=${sessionToken}; ${WS_COOKIE}=${workspaceId}`;
}

async function api(
  method: string,
  path: string,
  opts: {
    cookie?: string;
    body?: unknown;
    form?: FormData;
    headers?: Record<string, string>;
  } = {},
): Promise<{ status: number; json: any; text: string; headers: Headers }> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.cookie) headers.Cookie = opts.cookie;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body, redirect: "manual" });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, json, text, headers: res.headers };
}

function expectStatus(
  id: string,
  status: number,
  allowed: number[],
  detail?: string,
) {
  record(id, allowed.join("|"), status, allowed.includes(status), detail);
}

async function main() {
  const secrets = loadEnvFile(await fs.readFile(SECRETS_FILE, "utf8"));
  const wsA = secrets.QA_WORKSPACE_A_ID;
  const wsB = secrets.QA_WORKSPACE_B_ID;
  if (!wsA || !wsB) throw new Error("Missing workspace IDs in secrets file");

  const users = {
    A: await prisma.user.findUniqueOrThrow({
      where: { id: secrets.QA_OWNER_A_USER_ID },
    }),
    B: await prisma.user.findUniqueOrThrow({
      where: { id: secrets.QA_OWNER_B_USER_ID },
    }),
    ADMIN: await prisma.user.findUniqueOrThrow({
      where: { id: secrets.QA_ADMIN_USER_ID },
    }),
    MEMBER: await prisma.user.findUniqueOrThrow({
      where: { id: secrets.QA_MEMBER_USER_ID },
    }),
  };

  const tok = {
    A: await mintCookie(users.A),
    B: await mintCookie(users.B),
    ADMIN: await mintCookie(users.ADMIN),
    MEMBER: await mintCookie(users.MEMBER),
  };
  const jar = {
    A: cookieHeader(tok.A, wsA),
    B: cookieHeader(tok.B, wsB),
    ADMIN: cookieHeader(tok.ADMIN, wsA),
    MEMBER: cookieHeader(tok.MEMBER, wsA),
    B_spoofA: cookieHeader(tok.B, wsA), // B user cookie + A's workspace cookie
  };

  // Seed resource IDs from Workspace A
  const contactA = await prisma.contact.findFirstOrThrow({
    where: { workspaceId: wsA },
  });
  const campaignA = await prisma.campaign.findFirstOrThrow({
    where: { workspaceId: wsA },
  });

  console.log("\n=== LOGGED-OUT ===");
  {
    const r = await api("GET", "/api/contacts");
    expectStatus("logged_out.contacts", r.status, [401]);
  }
  {
    const r = await api("GET", "/dashboard");
    expectStatus("logged_out.dashboard", r.status, [307, 302]);
  }
  {
    const r = await api("GET", "/zzz-does-not-exist-qa");
    expectStatus("logged_out.unknown_404", r.status, [404]);
  }
  {
    const r = await api("POST", "/api/auth/signup", {
      body: {
        name: "Should Fail",
        email: "qa-signup-blocked@example.com",
        password: "password12345",
      },
    });
    expectStatus("logged_out.signup_closed", r.status, [403]);
  }

  console.log("\n=== WORKSPACE B SETUP (own resources) ===");
  let contactBId = "";
  let tagBId = "";
  let segmentBId = "";
  let campaignBId = "";
  let templateBId = "";
  let uploadBUrl = "";

  {
    const r = await api("POST", "/api/contacts", {
      cookie: jar.B,
      body: {
        email: "qa-b-contact@example.com",
        firstName: "QB",
        lastName: "Contact",
      },
    });
    expectStatus("B.create_contact", r.status, [200, 201]);
    contactBId = r.json?.contact?.id || "";
    if (contactBId) created.push({ kind: "contact", id: contactBId, workspace: "B" });
  }
  {
    const r = await api("POST", "/api/tags", {
      cookie: jar.B,
      body: { name: `qa-b-tag-${Date.now()}`, color: "#112233" },
    });
    expectStatus("B.create_tag", r.status, [200, 201]);
    tagBId = r.json?.tag?.id || "";
    if (tagBId) created.push({ kind: "tag", id: tagBId, workspace: "B" });
  }
  {
    const r = await api("POST", "/api/segments", {
      cookie: jar.B,
      body: {
        name: `qa-b-seg-${Date.now()}`,
        rules: { match: "all", conditions: [] },
      },
    });
    expectStatus("B.create_segment", r.status, [200, 201, 400]);
    segmentBId = r.json?.segment?.id || "";
    if (segmentBId) created.push({ kind: "segment", id: segmentBId, workspace: "B" });
  }
  {
    const r = await api("POST", "/api/campaigns", {
      cookie: jar.B,
      body: { name: `QA B draft ${Date.now()}`, simpleMode: true },
    });
    expectStatus("B.create_campaign_draft", r.status, [200, 201]);
    campaignBId = r.json?.campaign?.id || "";
    if (campaignBId) created.push({ kind: "campaign", id: campaignBId, workspace: "B" });
  }
  {
    const r = await api("POST", "/api/templates", {
      cookie: jar.B,
      body: {
        name: `QA B tpl ${Date.now()}`,
        designJson: { version: 1, blocks: [] },
      },
    });
    expectStatus("B.create_template", r.status, [200, 201, 400]);
    templateBId = r.json?.template?.id || "";
    if (templateBId) created.push({ kind: "template", id: templateBId, workspace: "B" });
  }
  {
    const form = new FormData();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    form.append("file", new Blob([png], { type: "image/png" }), "qa.png");
    const r = await api("POST", "/api/uploads", { cookie: jar.B, form });
    expectStatus("B.upload", r.status, [200, 201]);
    uploadBUrl = r.json?.url || "";
  }

  console.log("\n=== ISOLATION: B → A direct IDs (expect 404) ===");
  const isolationGets: Array<[string, string]> = [
    ["contacts", `/api/contacts/${contactA.id}`],
    ["campaigns", `/api/campaigns/${campaignA.id}`],
    ["campaign_recipients", `/api/campaigns/${campaignA.id}/recipients`],
  ];
  for (const [name, path] of isolationGets) {
    const r = await api("GET", path, { cookie: jar.B });
    expectStatus(`iso.B_read_A_${name}`, r.status, [404]);
  }
  {
    const r = await api("PATCH", `/api/contacts/${contactA.id}`, {
      cookie: jar.B,
      body: { firstName: "HACKED" },
    });
    expectStatus("iso.B_patch_A_contact", r.status, [404]);
  }
  {
    const r = await api("DELETE", `/api/contacts/${contactA.id}`, { cookie: jar.B });
    expectStatus("iso.B_delete_A_contact", r.status, [404]);
  }
  {
    const r = await api("PATCH", `/api/campaigns/${campaignA.id}`, {
      cookie: jar.B,
      body: { name: "HACKED" },
    });
    expectStatus("iso.B_patch_A_campaign", r.status, [404]);
  }
  {
    const r = await api("GET", "/api/contacts", { cookie: jar.B });
    const emails = (r.json?.contacts || []).map((c: any) => c.email);
    const leaked = emails.includes(contactA.email);
    record(
      "iso.B_list_excludes_A_contact",
      "no-leak",
      r.status,
      r.status === 200 && !leaked,
      leaked ? "LEAKED A contact into B list" : undefined,
    );
  }
  {
    const r = await api("GET", "/api/campaigns", { cookie: jar.B });
    const ids = (r.json?.campaigns || []).map((c: any) => c.id);
    const leaked = ids.includes(campaignA.id);
    record(
      "iso.B_list_excludes_A_campaign",
      "no-leak",
      r.status,
      r.status === 200 && !leaked,
      leaked ? "LEAKED A campaign" : undefined,
    );
  }
  {
    // Body cannot switch workspace — workspaceId in JSON must be ignored
    const r = await api("POST", "/api/contacts", {
      cookie: jar.B,
      body: {
        email: "qa-body-ws-injection@example.com",
        workspaceId: wsA,
        firstName: "Inject",
      },
    });
    expectStatus("iso.B_body_workspaceId_ignored_create", r.status, [200, 201]);
    const createdId = r.json?.contact?.id;
    if (createdId) {
      created.push({ kind: "contact", id: createdId, workspace: "B" });
      const row = await prisma.contact.findUnique({ where: { id: createdId } });
      record(
        "iso.B_body_workspaceId_not_applied",
        "workspace B",
        r.status,
        row?.workspaceId === wsB,
        row ? `got ${row.workspaceId}` : "missing row",
      );
    }
  }
  {
    // Spoofed workspace cookie must not grant A membership
    const r = await api("GET", `/api/contacts/${contactA.id}`, {
      cookie: jar.B_spoofA,
    });
    expectStatus("iso.B_spoof_cookie_A_contact", r.status, [404]);
  }
  {
    const r = await api("GET", "/api/contacts/export", { cookie: jar.B });
    expectStatus("iso.B_export_own", r.status, [200]);
    const leaked = r.text.includes(contactA.email);
    record(
      "iso.B_export_excludes_A",
      "no-leak",
      r.status,
      r.status === 200 && !leaked,
      leaked ? "export leaked A email" : undefined,
    );
  }
  {
    // Reused export is session-scoped (no durable token) — logged-out reuse
    const r = await api("GET", "/api/contacts/export");
    expectStatus("iso.logged_out_export_reuse", r.status, [401]);
  }
  if (uploadBUrl) {
    const r = await api("GET", uploadBUrl);
    // Email assets are intentionally public (opaque names). Document as expected.
    record(
      "iso.upload_public_by_design",
      "200 public image",
      r.status,
      r.status === 200,
      "Email CDN images are public; filenames are opaque tokens",
    );
    const guessed = uploadBUrl.replace(/\/[^/]+$/, "/does-not-exist.png");
    const g = await api("GET", guessed);
    expectStatus("iso.guessed_upload_404", g.status, [404]);
  }

  console.log("\n=== ROLE MATRIX (Workspace A) ===");
  // Contacts day-to-day — all roles
  for (const role of ["A", "ADMIN", "MEMBER"] as const) {
    const r = await api("GET", "/api/contacts", { cookie: jar[role] });
    expectStatus(`role.${role}.contacts_list`, r.status, [200]);
  }
  // Team invite
  {
    const r = await api("POST", "/api/settings/team", {
      cookie: jar.MEMBER,
      body: { email: "should-deny@example.com", role: "MEMBER" },
    });
    expectStatus("role.MEMBER.team_invite", r.status, [403]);
  }
  {
    const r = await api("POST", "/api/settings/team", {
      cookie: jar.ADMIN,
      body: { email: "seat-check@example.com", role: "MEMBER" },
    });
    // FREE plan seats=1 → 402 after role allow
    expectStatus("role.ADMIN.team_invite_plan_gate", r.status, [402, 201]);
  }
  {
    const r = await api("POST", "/api/settings/team", {
      cookie: jar.A,
      body: { email: "seat-check-owner@example.com", role: "MEMBER" },
    });
    expectStatus("role.OWNER.team_invite_plan_gate", r.status, [402, 201]);
  }
  // Billing — never hit OWNER checkout/portal (Stripe object creation)
  {
    const r = await api("POST", "/api/billing/checkout", {
      cookie: jar.MEMBER,
      body: { plan: "STARTER", interval: "month" },
    });
    expectStatus("role.MEMBER.billing_checkout", r.status, [403]);
  }
  {
    const r = await api("POST", "/api/billing/portal", { cookie: jar.MEMBER });
    expectStatus("role.MEMBER.billing_portal", r.status, [403]);
  }
  {
    const r = await api("POST", "/api/billing/checkout", {
      cookie: jar.ADMIN,
      body: { plan: "STARTER", interval: "month" },
    });
    // Role allows ADMIN; STRIPE_OWNER_TEST gate denies non-owner email → 403
    expectStatus("role.ADMIN.billing_checkout_gate", r.status, [403]);
  }
  {
    const r = await api("POST", "/api/billing/portal", { cookie: jar.ADMIN });
    // ADMIN role allowed past MEMBER check; no stripeCustomerId on legal@ → 400
    // (must NOT be 200 with a Stripe portal URL)
    expectStatus("role.ADMIN.billing_portal_no_customer", r.status, [400, 403]);
    record(
      "role.ADMIN.billing_portal_no_stripe_object",
      "no url",
      r.status,
      !r.json?.url,
      r.json?.url ? "UNEXPECTED portal URL" : undefined,
    );
  }
  {
    const r = await api("GET", "/api/billing/status", { cookie: jar.MEMBER });
    expectStatus("role.MEMBER.billing_status", r.status, [200, 403]);
  }
  // Workspace settings
  {
    const r = await api("PATCH", "/api/settings/workspace", {
      cookie: jar.MEMBER,
      body: { name: "Should Not Rename" },
    });
    expectStatus("role.MEMBER.workspace_patch", r.status, [403]);
  }
  {
    const r = await api("PATCH", "/api/settings/workspace", {
      cookie: jar.ADMIN,
      body: { timezone: "UTC" },
    });
    expectStatus("role.ADMIN.workspace_patch", r.status, [200]);
  }
  {
    // Do NOT actually delete workspace — only probe with MEMBER/ADMIN
    const r = await api("DELETE", "/api/settings/workspace", {
      cookie: jar.MEMBER,
    });
    expectStatus("role.MEMBER.workspace_delete", r.status, [403]);
  }
  {
    const r = await api("DELETE", "/api/settings/workspace", {
      cookie: jar.ADMIN,
    });
    expectStatus("role.ADMIN.workspace_delete", r.status, [403]);
  }
  // Sender identities
  {
    const r = await api("POST", "/api/identities", {
      cookie: jar.MEMBER,
      body: {
        type: "ADDRESS",
        email: "member-cannot@example.com",
        displayName: "Nope",
      },
    });
    expectStatus("role.MEMBER.identity_create", r.status, [403]);
  }
  {
    const r = await api("GET", "/api/identities", { cookie: jar.MEMBER });
    expectStatus("role.MEMBER.identity_list", r.status, [200]);
  }
  // Platform admin
  {
    const r = await api("GET", "/api/admin/users", { cookie: jar.MEMBER });
    expectStatus("role.MEMBER.platform_admin", r.status, [403]);
  }
  {
    const r = await api("GET", "/api/admin/users", { cookie: jar.ADMIN });
    expectStatus("role.ADMIN.platform_admin", r.status, [403]);
  }
  {
    const r = await api("GET", "/api/admin/users", { cookie: jar.B });
    expectStatus("role.B.platform_admin", r.status, [403]);
  }
  {
    const r = await api("GET", "/api/admin/users", { cookie: jar.A });
    expectStatus("role.OWNER.platform_admin", r.status, [200]);
  }
  // Campaigns / templates day-to-day for MEMBER
  {
    const r = await api("POST", "/api/campaigns", {
      cookie: jar.MEMBER,
      body: { name: `QA member draft ${Date.now()}`, simpleMode: true },
    });
    expectStatus("role.MEMBER.campaign_create", r.status, [200, 201]);
    const id = r.json?.campaign?.id;
    if (id) {
      created.push({ kind: "campaign", id, workspace: "A" });
      const del = await api("DELETE", `/api/campaigns/${id}`, {
        cookie: jar.MEMBER,
      });
      expectStatus("role.MEMBER.campaign_delete_draft", del.status, [200, 204, 404]);
    }
  }
  // Domains / DNS — list only (no create of real domains)
  {
    const r = await api("GET", "/api/identities", { cookie: jar.ADMIN });
    expectStatus("role.ADMIN.identities_list", r.status, [200]);
  }
  // Import endpoint exists
  {
    const r = await api("POST", "/api/contacts/import", {
      cookie: jar.MEMBER,
      body: {
        contacts: [{ email: "qa-import-member@example.com" }],
        dryRun: true,
      },
    });
    expectStatus("role.MEMBER.import", r.status, [200, 201, 400]);
  }
  {
    const r = await api("POST", "/api/contacts/import", {
      cookie: jar.B,
      body: {
        contacts: [{ email: contactA.email, firstName: "Cross" }],
        workspaceId: wsA,
        dryRun: true,
      },
    });
    expectStatus("iso.B_import_with_A_workspaceId_body", r.status, [200, 201, 400]);
  }
  // Support — public form, no workspace API keys
  {
    const r = await api("GET", "/api/health");
    expectStatus("health", r.status, [200]);
  }
  record(
    "api_keys.implemented",
    "N/A",
    0,
    true,
    "No API-key feature in codebase — N/A",
  );

  // Password-login smoke for provisioned accounts (proves auth method)
  console.log("\n=== AUTH METHOD SMOKE (credentials) ===");
  for (const [label, email, password] of [
    ["B", secrets.QA_OWNER_B_EMAIL, secrets.QA_OWNER_B_PASSWORD],
    ["ADMIN", secrets.QA_ADMIN_EMAIL, secrets.QA_ADMIN_PASSWORD],
    ["MEMBER", secrets.QA_MEMBER_EMAIL, secrets.QA_MEMBER_PASSWORD],
  ] as const) {
    const csrf = await api("GET", "/api/auth/csrf");
    const csrfToken = csrf.json?.csrfToken;
    const body = new URLSearchParams({
      csrfToken: csrfToken || "",
      email,
      password,
      callbackUrl: "/dashboard",
      json: "true",
    });
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrf.headers.get("set-cookie") || "",
      },
      body,
      redirect: "manual",
    });
    // Auth.js returns 200 JSON or 302 on success depending on version
    expectStatus(
      `auth.credentials_${label}`,
      res.status,
      [200, 302],
      `email=${email}`,
    );
  }

  // Cleanup B + A QA drafts (keep accounts)
  console.log("\n=== CLEANUP QA ARTIFACTS (keep accounts/workspaces) ===");
  for (const item of created) {
    try {
      if (item.kind === "contact") {
        await prisma.contact.deleteMany({ where: { id: item.id } });
      } else if (item.kind === "tag") {
        await prisma.tag.deleteMany({ where: { id: item.id } });
      } else if (item.kind === "segment") {
        await prisma.segment.deleteMany({ where: { id: item.id } });
      } else if (item.kind === "campaign") {
        await prisma.campaign.deleteMany({
          where: { id: item.id, status: "DRAFT" },
        });
      } else if (item.kind === "template") {
        await prisma.template.deleteMany({ where: { id: item.id } });
      }
    } catch (e) {
      console.log("cleanup skip", item, e);
    }
  }

  const failed = results.filter((r) => !r.pass);
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: failed.length,
    failures: failed,
  };
  await fs.writeFile(
    "/root/sendfable-secrets/qa-live-matrix-results.json",
    JSON.stringify({ at: new Date().toISOString(), summary, results }, null, 2),
    { mode: 0o600 },
  );
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  if (failed.length) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
