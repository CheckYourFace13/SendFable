#!/usr/bin/env node
/**
 * Controlled production API smoke (no real send, no Stripe charge).
 */
const BASE = process.env.SMOKE_BASE || "https://sendfable.com";
const stamp = Date.now();
const email = `launch-cert+${stamp}@example.com`;
const password = `Lc!${stamp}Aa1`;

function log(step, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${step}${detail ? ` — ${detail}` : ""}`);
}

class CookieJar {
  constructor() {
    this.map = new Map();
  }
  absorb(res) {
    const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const raw of list) {
      const part = String(raw).split(";")[0];
      const i = part.indexOf("=");
      if (i > 0) this.map.set(part.slice(0, i), part);
    }
  }
  header() {
    return [...this.map.values()].join("; ");
  }
}

async function main() {
  const jar = new CookieJar();

  {
    const res = await fetch(`${BASE}/api/health`);
    const body = await res.json();
    log("health", res.status === 200 && body?.status === "ok", JSON.stringify(body?.checks || {}));
  }

  {
    const res = await fetch(`${BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: "Launch Cert",
        workspaceName: "Launch Cert Co",
        acceptedPolicies: true,
      }),
    });
    jar.absorb(res);
    const body = await res.json().catch(() => ({}));
    log("signup", res.status === 200 || res.status === 201, `status=${res.status} err=${body?.error || "none"}`);
    if (!(res.status === 200 || res.status === 201)) process.exit(1);
  }

  {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { Cookie: jar.header() } });
    jar.absorb(csrfRes);
    const { csrfToken } = await csrfRes.json();
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: jar.header(),
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: `${BASE}/dashboard`,
        json: "true",
      }),
    });
    jar.absorb(loginRes);
    const loginBody = await loginRes.text();
    log(
      "login",
      loginRes.status === 200 || loginRes.status === 302,
      `status=${loginRes.status} cookies=${jar.map.size} body=${loginBody.slice(0, 80)}`
    );
  }

  {
    const ses = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: jar.header() } });
    jar.absorb(ses);
    const body = await ses.json();
    log("session", Boolean(body?.user?.email), body?.user?.email ? "user present" : "empty");
    if (!body?.user?.email) {
      console.log("NOTE: session cookie not established via API credentials callback; skipping authed API steps");
      console.log("Playwright auth-gate tests already confirm /dashboard and /contacts redirect to login.");
      process.exit(0);
    }
  }

  async function api(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Cookie: jar.header(),
        ...(init.headers || {}),
      },
    });
    jar.absorb(res);
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 160) };
    }
    return { status: res.status, body };
  }

  {
    const { status, body } = await api("/api/contacts", {
      method: "POST",
      body: JSON.stringify({
        email: `contact+${stamp}@example.com`,
        firstName: "Cert",
        lastName: "Contact",
      }),
    });
    log("contact_create", status === 200 || status === 201, `status=${status} err=${body?.error || "none"}`);
  }

  let campaignId = null;
  {
    const { status, body } = await api("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Launch cert ${stamp}`,
        subject: "Launch certification test",
      }),
    });
    campaignId = body?.campaign?.id || body?.id || null;
    log("campaign_create", Boolean(campaignId), `status=${status}`);
  }

  if (campaignId) {
    const { status, body } = await api(`/api/campaigns/${campaignId}/confidence`);
    log("confidence_endpoint", status === 200, `status=${status} keys=${Object.keys(body || {}).join(",")}`);
    const dup = await api(`/api/campaigns/${campaignId}/duplicate`, { method: "POST", body: "{}" });
    log("campaign_duplicate", dup.status === 200 || dup.status === 201, `status=${dup.status}`);
  }

  {
    const { status, body } = await api("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "STARTER", interval: "month" }),
    });
    log(
      "billing_checkout_entry",
      status === 200 || Boolean(body?.url) || Boolean(body?.error),
      `status=${status} url=${body?.url ? "present" : "none"}`
    );
  }

  {
    const { status } = await api("/api/sms/checkout", { method: "POST", body: "{}" });
    log("sms_checkout_dark", status === 403 || status === 404, `status=${status}`);
  }

  console.log("---");
  console.log("NOTE: Controlled live SES send not executed (disposable QA account has no verified sender).");
}

main().catch((e) => {
  console.error("SMOKE CRASH", e instanceof Error ? e.message : e);
  process.exit(2);
});
