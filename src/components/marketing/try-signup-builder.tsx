"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  TRY_BUSINESS_TYPES,
  categoryToTryType,
  defaultTryConfig,
  sanitizeTryConfig,
  tryBusinessLabel,
  trySiteChrome,
  type TryIntentEvent,
  type TrySignupConfig,
} from "@/lib/try-signup/config";
import { tryInstallPlatforms } from "@/lib/try-signup/install";
import { PLANS } from "@/lib/plans";
import { trackClientEvent } from "@/components/marketing/marketing-analytics";

const LIVE_CTA = "MAKE THIS LIVE — FREE";

export function TrySignupBuilder() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <BuilderInner />
    </div>
  );
}

function BuilderInner() {
  const search = useSearchParams();
  const typeHint = categoryToTryType(search.get("type") || search.get("utm_term"));
  const [token, setToken] = useState(search.get("try")?.trim() || "");
  const [config, setConfig] = useState<TrySignupConfig>(() => defaultTryConfig(typeHint));
  const [demoEmail, setDemoEmail] = useState("");
  const [demoFirst, setDemoFirst] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [demoJoined, setDemoJoined] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const existing = search.get("try")?.trim();
    trackClientEvent("try_page_view");
    const url = existing
      ? `/api/try/signup-tool?token=${encodeURIComponent(existing)}`
      : `/api/try/signup-tool?type=${encodeURIComponent(typeHint)}`;
    void fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.config) setConfig(sanitizeTryConfig(data.config));
        if (data.token) setToken(data.token);
        void save({ event: "try_page_view", tokenOverride: data.token, next: data.config });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(opts?: {
    event?: TryIntentEvent;
    next?: TrySignupConfig;
    tokenOverride?: string;
  }) {
    const body = {
      token: opts?.tokenOverride || token || undefined,
      config: opts?.next || config,
      event: opts?.event,
      category: typeHint,
    };
    const res = await fetch("/api/try/signup-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (typeof data.token === "string" && data.token) {
      setToken(data.token);
      try {
        localStorage.setItem("sf_try_signup", data.token);
      } catch {
        /* ignore */
      }
    }
    return data;
  }

  function update(patch: Partial<TrySignupConfig>) {
    const next = sanitizeTryConfig({ ...config, ...patch });
    setConfig(next);
    setDemoJoined(false);
    setDemoEmail("");
    setDemoFirst("");
    setDemoPhone("");
    if (next.display !== "popup") setPopupOpen(false);
    trackClientEvent("customization_changed");
    void save({ next, event: "customization_changed" });
  }

  function joinDemo(e: React.FormEvent) {
    e.preventDefault();
    trackClientEvent("demo_signup_submitted");
    setDemoJoined(true);
    setDemoEmail("");
    setDemoFirst("");
    setDemoPhone("");
    trackClientEvent("demo_signup_success");
  }

  const chrome = trySiteChrome(config.businessType);
  const signupHref = (() => {
    const q = new URLSearchParams();
    if (token) q.set("try", token);
    const utm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
    for (const key of utm) {
      const v = search.get(key);
      if (v) q.set(key, v);
    }
    q.set("type", config.businessType);
    return `/signup?${q.toString()}`;
  })();
  const platform = tryInstallPlatforms().find((p) => p.id === config.platform) || tryInstallPlatforms()[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">See it working.</h1>
        <p className="mt-2 text-sm text-ink/60">This is a demo. Nothing is saved or sent.</p>
      </div>

      <WebsitePreview
        siteName={chrome.siteName}
        tagline={chrome.tagline}
        config={config}
        demoEmail={demoEmail}
        demoFirst={demoFirst}
        demoPhone={demoPhone}
        demoJoined={demoJoined}
        popupOpen={popupOpen}
        onEmail={setDemoEmail}
        onFirst={setDemoFirst}
        onPhone={setDemoPhone}
        onJoin={joinDemo}
        onOpenPopup={() => setPopupOpen(true)}
        onClosePopup={() => setPopupOpen(false)}
      />

      {demoJoined ? (
        <section className="rounded-xl border border-ink/10 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Your audience</h2>
          <ul className="mt-3 space-y-1 text-sm text-ink">
            <li>
              {config.audienceName} — 1 subscriber
            </li>
            <li>
              {config.extraAudienceName} — 0 subscribers
            </li>
          </ul>
          <p className="mt-3 text-sm text-ink/60">Create as many audiences as you need.</p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Make it yours</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Business type</span>
          <select
            aria-label="Business type"
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-base"
            value={config.businessType}
            onChange={(e) => {
              const type = e.target.value as TrySignupConfig["businessType"];
              const next = defaultTryConfig(type);
              next.platform = config.platform;
              next.display = config.display;
              setConfig(next);
              setDemoJoined(false);
              trackClientEvent("customization_changed");
              void save({ next, event: "customization_changed" });
            }}
          >
            {TRY_BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>
                {tryBusinessLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Audience name</span>
          <input
            aria-label="Audience name"
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-base"
            value={config.audienceName}
            maxLength={40}
            onChange={(e) => update({ audienceName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Headline</span>
          <input
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-base"
            value={config.headline}
            maxLength={80}
            onChange={(e) => update({ headline: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Button text</span>
          <input
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-base"
            value={config.buttonLabel}
            maxLength={32}
            onChange={(e) => update({ buttonLabel: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={config.firstName}
              onChange={(e) => update({ firstName: e.target.checked })}
            />
            First name field
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={config.phone}
              onChange={(e) => update({ phone: e.target.checked, smsConsent: false })}
            />
            Phone field
          </label>
        </div>
        {config.phone ? (
          <label className="flex items-start gap-2 text-sm text-ink/60">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={false} disabled readOnly />
            SMS consent stays off. You can turn it on later.
          </label>
        ) : null}

        <div>
          <p className="mb-2 text-sm text-ink/70">How it appears</p>
          <div className="grid grid-cols-2 gap-2">
            {(["inline", "popup"] as const).map((display) => (
              <button
                key={display}
                type="button"
                className={`h-11 rounded-lg border text-sm font-medium ${
                  config.display === display
                    ? "border-coral bg-coral/10 text-ink"
                    : "border-ink/15 bg-white text-ink/70"
                }`}
                onClick={() => update({ display })}
              >
                {display === "inline" ? "Inline" : "Popup"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Put this on your website</h2>
          <div className="flex flex-wrap gap-2">
            {tryInstallPlatforms().map((p) => (
              <button
                key={p.id}
                type="button"
                className={`h-11 rounded-lg border px-3 text-sm font-medium ${
                  config.platform === p.id
                    ? "border-coral bg-coral/10 text-ink"
                    : "border-ink/15 bg-white text-ink/70"
                }`}
                onClick={() => {
                  const next = sanitizeTryConfig({ ...config, platform: p.id });
                  setConfig(next);
                  trackClientEvent("platform_selected", { platform: p.id });
                  void save({ next, event: "platform_selected" });
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
            {platform.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-sm text-ink/60">Your code will be ready when you make this signup live.</p>
        </section>

      <section className="rounded-xl border border-ink/10 bg-white p-5">
        <Button asChild className="h-12 w-full bg-coral-solid text-base text-white hover:bg-coral-hover">
          <Link
            href={signupHref}
            onClick={() => {
              trackClientEvent("make_live_clicked");
              trackClientEvent("signup_started");
              void save({ event: "make_live_clicked" });
            }}
          >
            {LIVE_CTA}
          </Link>
        </Button>
        <p className="mt-3 text-center text-sm text-ink/60">
          Up to {PLANS.FREE.contactCap.toLocaleString()} contacts and{" "}
          {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month.
        </p>
        <p className="mt-1 text-center text-sm text-ink/60">No credit card required.</p>
      </section>
    </div>
  );
}

function WebsitePreview(props: {
  siteName: string;
  tagline: string;
  config: TrySignupConfig;
  demoEmail: string;
  demoFirst: string;
  demoPhone: string;
  demoJoined: boolean;
  popupOpen: boolean;
  onEmail: (v: string) => void;
  onFirst: (v: string) => void;
  onPhone: (v: string) => void;
  onJoin: (e: React.FormEvent) => void;
  onOpenPopup: () => void;
  onClosePopup: () => void;
}) {
  const form = (
    <SignupBox
      config={props.config}
      demoEmail={props.demoEmail}
      demoFirst={props.demoFirst}
      demoPhone={props.demoPhone}
      demoJoined={props.demoJoined}
      onEmail={props.onEmail}
      onFirst={props.onFirst}
      onPhone={props.onPhone}
      onJoin={props.onJoin}
    />
  );

  return (
    <div className="overflow-hidden rounded-xl border border-ink/15 bg-[#eef1f4] shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-ink/10 bg-[#e5e7eb] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#f9a8a8]" />
        <span className="h-2 w-2 rounded-full bg-[#fde68a]" />
        <span className="h-2 w-2 rounded-full bg-[#86efac]" />
        <span className="ml-2 truncate text-xs text-ink/50">yoursite.com</span>
      </div>
      <div className="relative min-h-[280px] bg-[#f8f4ea] p-5 sm:p-6">
        <p className="text-2xl font-semibold text-ink">{props.siteName}</p>
        <p className="mt-1 text-sm text-ink/60">{props.tagline}</p>
        {props.config.display === "inline" ? <div className="mt-5">{form}</div> : (
          <div className="mt-5">
            <button
              type="button"
              className="h-11 rounded-lg bg-coral-solid px-4 text-sm font-semibold text-white"
              onClick={props.onOpenPopup}
            >
              Open signup
            </button>
            {props.popupOpen ? (
              <div className="absolute inset-0 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
                <div className="w-full max-w-sm">
                  <button
                    type="button"
                    className="mb-2 ml-auto block text-sm text-white"
                    onClick={props.onClosePopup}
                  >
                    Close
                  </button>
                  {form}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function SignupBox(props: {
  config: TrySignupConfig;
  demoEmail: string;
  demoFirst: string;
  demoPhone: string;
  demoJoined: boolean;
  onEmail: (v: string) => void;
  onFirst: (v: string) => void;
  onPhone: (v: string) => void;
  onJoin: (e: React.FormEvent) => void;
}) {
  if (props.demoJoined) {
    return (
      <div className="rounded-lg border border-ink/10 bg-white p-4">
        <p className="text-base font-semibold text-ink">✓ Added to {props.config.audienceName}</p>
        <p className="mt-2 text-sm text-ink/60">{"That's what your visitors will see."}</p>
      </div>
    );
  }
  return (
    <form onSubmit={props.onJoin} className="space-y-3 rounded-lg border border-ink/10 bg-white p-4">
      {props.config.headline ? (
        <p className="text-base font-semibold text-ink">{props.config.headline}</p>
      ) : null}
      {props.config.firstName ? (
        <input
          type="text"
          autoComplete="off"
          placeholder="First name"
          value={props.demoFirst}
          onChange={(e) => props.onFirst(e.target.value)}
          className="h-11 w-full rounded-md border border-ink/15 px-3 text-base"
        />
      ) : null}
      <input
        type="email"
        required
        autoComplete="off"
        name="demo-email"
        aria-label="Email"
        placeholder="chris@example.com"
        value={props.demoEmail}
        onChange={(e) => props.onEmail(e.target.value)}
        className="h-11 w-full rounded-md border border-ink/15 px-3 text-base"
      />
      {props.config.phone ? (
        <input
          type="tel"
          autoComplete="off"
          placeholder="Phone"
          value={props.demoPhone}
          onChange={(e) => props.onPhone(e.target.value)}
          className="h-11 w-full rounded-md border border-ink/15 px-3 text-base"
        />
      ) : null}
      <button type="submit" className="h-11 w-full rounded-md bg-coral-solid text-sm font-semibold text-white">
        {props.config.buttonLabel}
      </button>
      <p className="text-xs text-ink/50">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
