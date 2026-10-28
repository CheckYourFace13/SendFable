"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  TRY_BUSINESS_TYPES,
  defaultTryConfig,
  sanitizeTryConfig,
  tryBusinessLabel,
  tryBusinessPitch,
  type TryBusinessType,
  type TrySignupConfig,
} from "@/lib/try-signup/config";
import { PLANS } from "@/lib/plans";
import { trackClientEvent } from "@/components/marketing/marketing-analytics";

export function TrySignupBuilder() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Try it</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
        Build your signup tool
      </h1>
      <p className="mt-3 max-w-xl text-lg text-ink/75">
        Preview what you would put on your website. Nothing is published and nobody is emailed until
        you create a free account.
      </p>
      <BuilderInner />
    </div>
  );
}

function BuilderInner() {
  const search = useSearchParams();
  const [token, setToken] = useState(search.get("try")?.trim() || "");
  const [config, setConfig] = useState<TrySignupConfig>(() =>
    defaultTryConfig((search.get("utm_term") as TryBusinessType) || "other")
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const existing = search.get("try")?.trim();
    trackClientEvent("builder_started");
    void fetch(existing ? `/api/try/signup-tool?token=${encodeURIComponent(existing)}` : "/api/try/signup-tool")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.config) setConfig(sanitizeTryConfig(data.config));
        if (data.token) setToken(data.token);
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
          void save({ event: "builder_started" });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(opts?: { event?: "builder_started" | "builder_previewed" | "activation_clicked" | "signup_started"; next?: TrySignupConfig }) {
    const body = {
      token: token || undefined,
      config: opts?.next || config,
      event: opts?.event,
      category: search.get("utm_term") || undefined,
    };
    const res = await fetch("/api/try/signup-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (data?.token) {
      setToken(data.token);
      try {
        localStorage.setItem("sf_try_signup", data.token);
      } catch {
        /* ignore */
      }
    }
    return data?.token as string | undefined;
  }

  function update(patch: Partial<TrySignupConfig>) {
    setConfig((prev) => {
      let next = { ...prev, ...patch };
      if (patch.businessType && patch.businessType !== prev.businessType) {
        next = { ...defaultTryConfig(patch.businessType), display: prev.display, firstName: prev.firstName, phone: prev.phone };
      }
      if (patch.phone === false) next.smsConsent = false;
      void save({ next, event: "builder_previewed" });
      return next;
    });
  }

  const activateHref = useMemo(() => {
    const q = new URLSearchParams();
    if (token) q.set("try", token);
    const utmSource = search.get("utm_source");
    const utmMedium = search.get("utm_medium");
    const utmCampaign = search.get("utm_campaign");
    const utmContent = search.get("utm_content");
    if (utmSource) q.set("utm_source", utmSource);
    if (utmMedium) q.set("utm_medium", utmMedium);
    if (utmCampaign) q.set("utm_campaign", utmCampaign);
    if (utmContent) q.set("utm_content", utmContent);
    if (!utmCampaign) q.set("utm_campaign", "try_signup");
    return `/signup?${q.toString()}`;
  }, [token, search]);

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <label className="block text-sm font-medium text-ink">
          Business
          <select
            className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2"
            value={config.businessType}
            onChange={(e) => update({ businessType: e.target.value as TryBusinessType })}
          >
            {TRY_BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {tryBusinessLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-ink">
          Audience name
          <input
            className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2"
            value={config.audienceName}
            onChange={(e) => update({ audienceName: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Another audience you can add later
          <input
            className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2"
            value={config.extraAudienceName}
            onChange={(e) => update({ extraAudienceName: e.target.value })}
          />
        </label>
        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium text-ink">Fields</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked disabled /> Email (required)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.firstName}
              onChange={(e) => update({ firstName: e.target.checked })}
            />
            First name
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.phone}
              onChange={(e) => update({ phone: e.target.checked })}
            />
            Phone (optional)
          </label>
          {config.phone ? (
            <label className="flex items-center gap-2 pl-6">
              <input
                type="checkbox"
                checked={config.smsConsent}
                onChange={(e) => update({ smsConsent: e.target.checked })}
              />
              Ask for text-message consent separately
            </label>
          ) : null}
        </fieldset>
        <fieldset className="flex gap-4 text-sm">
          <legend className="sr-only">Preview style</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="display"
              checked={config.display === "inline"}
              onChange={() => update({ display: "inline" })}
            />
            Inline
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="display"
              checked={config.display === "popup"}
              onChange={() => update({ display: "popup" })}
            />
            Popup
          </label>
        </fieldset>
        {!ready ? <p className="text-sm text-ink/50">Loading preview…</p> : null}
      </form>

      <div>
        <Preview config={config} />
        <ol className="mt-6 space-y-2 text-sm text-ink/80">
          <li>
            <strong>Collect.</strong> People who sign up are stored in your {config.audienceName}{" "}
            audience.
          </li>
          <li>
            <strong>Organize.</strong> Add {config.extraAudienceName} as a second audience when you
            need it.
          </li>
          <li>
            <strong>Create.</strong> Scribe turns new website content into a draft for you to review.
          </li>
          <li>
            <strong>Schedule.</strong> Nothing sends until you choose the date and time.
          </li>
        </ol>
        <p className="mt-3 text-sm text-ink/70">{tryBusinessPitch(config.businessType)}</p>
        <p className="mt-3 text-sm text-ink/70">
          Your contacts stay yours. Export them anytime. Start free — {PLANS.FREE.contactCap}{" "}
          contacts and {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month.
        </p>
        <div className="mt-6">
          <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
            <Link
              href={activateHref}
              onClick={() => {
                trackClientEvent("activation_clicked");
                void save({ event: "activation_clicked" });
              }}
            >
              Use this on my website
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Preview({ config }: { config: TrySignupConfig }) {
  return (
    <div
      className={`rounded-xl border border-ink/10 bg-white p-5 shadow-sm ${
        config.display === "popup" ? "ring-2 ring-coral/30" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        {config.display === "popup" ? "Popup preview" : "Inline preview"}
      </p>
      <h2 className="mt-2 font-display text-2xl text-ink">{config.headline}</h2>
      <p className="mt-1 text-sm text-ink/65">Your {config.audienceName} list</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          Email
          <span className="mt-1 block rounded-md border border-ink/15 bg-parchment/40 px-3 py-2 text-ink/40">
            you@example.com
          </span>
        </label>
        {config.firstName ? (
          <label className="block text-sm">
            First name
            <span className="mt-1 block rounded-md border border-ink/15 bg-parchment/40 px-3 py-2 text-ink/40">
              Optional
            </span>
          </label>
        ) : null}
        {config.phone ? (
          <label className="block text-sm">
            Phone
            <span className="mt-1 block rounded-md border border-ink/15 bg-parchment/40 px-3 py-2 text-ink/40">
              Optional
            </span>
          </label>
        ) : null}
        {config.smsConsent ? (
          <p className="text-xs text-ink/60">
            A separate, unchecked box will ask for text-message consent. Phone alone is not consent.
          </p>
        ) : null}
        <div className="inline-block rounded-md bg-coral-solid px-4 py-2 text-sm font-semibold text-white">
          {config.buttonLabel}
        </div>
      </div>
    </div>
  );
}
