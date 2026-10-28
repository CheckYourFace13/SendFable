"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  TRY_BUSINESS_TYPES,
  categoryToTryType,
  defaultTryConfig,
  sanitizeTryConfig,
  tryBusinessLabel,
  type TryBusinessType,
  type TrySignupConfig,
} from "@/lib/try-signup/config";
import {
  TRY_PREVIEW_SNIPPET,
  tryInstallPlatforms,
  type TryInstallPlatform,
} from "@/lib/try-signup/install";
import { PLANS } from "@/lib/plans";
import { trackClientEvent } from "@/components/marketing/marketing-analytics";

export function TrySignupBuilder() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <BuilderInner />
    </div>
  );
}

function BuilderInner() {
  const search = useSearchParams();
  const typeHint = categoryToTryType(search.get("type") || search.get("utm_term"));
  const [token, setToken] = useState(search.get("try")?.trim() || "");
  const [config, setConfig] = useState<TrySignupConfig>(() => defaultTryConfig(typeHint));
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<TryInstallPlatform>("wordpress");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const existing = search.get("try")?.trim();
    trackClientEvent("builder_started");
    const url = existing
      ? `/api/try/signup-tool?token=${encodeURIComponent(existing)}`
      : `/api/try/signup-tool?type=${encodeURIComponent(typeHint)}`;
    void fetch(url)
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

  async function save(opts?: {
    event?: "builder_started" | "builder_previewed" | "activation_clicked" | "signup_started";
    next?: TrySignupConfig;
  }) {
    const body = {
      token: token || undefined,
      config: opts?.next || config,
      event: opts?.event,
      category: typeHint,
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
        next = {
          ...defaultTryConfig(patch.businessType),
          display: prev.display,
          firstName: prev.firstName,
          phone: prev.phone,
        };
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
    q.set("type", config.businessType);
    return `/signup?${q.toString()}`;
  }, [token, search, config.businessType]);

  const platforms = tryInstallPlatforms();
  const selected = platforms.find((p) => p.id === platform) || platforms[0]!;

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(TRY_PREVIEW_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Your signup tool</h1>
      <p className="mt-2 max-w-xl text-ink/70">Preview what you can put on your website.</p>

      <div className="mt-8">
        <Preview config={config} />
        {!ready ? <p className="mt-3 text-sm text-ink/50">Loading preview…</p> : null}
      </div>

      <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
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
        <label className="block text-sm font-medium text-ink sm:col-span-2">
          Another audience you can add later
          <input
            className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2"
            value={config.extraAudienceName}
            onChange={(e) => update({ extraAudienceName: e.target.value })}
          />
        </label>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Add it to your website</h2>
        <p className="mt-2 text-sm text-ink/70">Choose your website:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                platform === p.id
                  ? "border-ink bg-ink text-white"
                  : "border-ink/20 bg-white text-ink hover:border-ink/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink/80">
          {selected.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {selected.fullGuide ? (
          <p className="mt-2 text-sm">
            <Link href={selected.fullGuide} className="text-teal hover:underline">
              Full {selected.label} instructions
            </Link>
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Preview only</p>
        <p className="mt-1 text-sm text-ink/70">
          This snippet is a preview. It will not collect signups until you activate it.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
          {TRY_PREVIEW_SNIPPET}
        </pre>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => void copyPreview()}>
            {copied ? "Copied preview code" : "Copy preview code"}
          </Button>
          <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
            <Link
              href={activateHref}
              onClick={() => {
                trackClientEvent("activation_clicked");
                void save({ event: "activation_clicked" });
              }}
            >
              Activate this signup
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-sm text-ink/70">Create your free account to activate this signup.</p>
        <p className="mt-2 text-sm text-ink/60">
          Free to start — up to {PLANS.FREE.contactCap.toLocaleString()} contacts and{" "}
          {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month.
        </p>
      </section>
    </div>
  );
}

function Preview({ config }: { config: TrySignupConfig }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Preview</p>
      <h2 className="mt-2 font-display text-2xl text-ink">{config.headline}</h2>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          Email
          <span className="mt-1 block rounded-md border border-ink/15 bg-parchment/40 px-3 py-2 text-ink/40">
            you@example.com
          </span>
        </label>
        <div className="inline-block rounded-md bg-coral-solid px-4 py-2 text-sm font-semibold text-white">
          {config.buttonLabel}
        </div>
      </div>
      <p className="mt-4 flex flex-wrap gap-2 text-xs text-ink/70">
        <span className="rounded-full border border-ink/15 px-2 py-1">{config.audienceName}</span>
        <span className="rounded-full border border-ink/15 px-2 py-1">{config.extraAudienceName}</span>
      </p>
    </div>
  );
}
