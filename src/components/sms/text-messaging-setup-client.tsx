"use client";

/**
 * Simplified customer Text Messaging setup — SendFable-branded, no provider jargon.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type UseCase = { id: string; label: string; description: string };

type Prefill = {
  legalEntityName: string;
  dbaBrandName: string;
  entityType: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  websiteUrl: string;
  supportEmail: string;
  supportPhone: string;
  smsUseCase: string;
};

type ProfileView = {
  status: string;
  statusLabel: string;
  statusMessage: string;
  attentionHint: string | null;
  einOnFile: boolean;
  disclosureAccepted: boolean;
};

const STEPS = ["Business", "Texting use", "Consent", "Review"] as const;

export function TextMessagingSetupClient() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [optInUrl, setOptInUrl] = useState<string | null>(null);

  const [legalEntityName, setLegalEntityName] = useState("");
  const [dbaBrandName, setDbaBrandName] = useState("");
  const [einBrn, setEinBrn] = useState("");
  const [entityType, setEntityType] = useState("PRIVATE_PROFIT");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [smsUseCase, setSmsUseCase] = useState("MARKETING");
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [einOnFile, setEinOnFile] = useState(false);

  const applyPrefill = useCallback((p: Prefill, view: ProfileView | null) => {
    setLegalEntityName(p.legalEntityName || "");
    setDbaBrandName(p.dbaBrandName || "");
    setEntityType(p.entityType || "PRIVATE_PROFIT");
    setStreet(p.street || "");
    setCity(p.city || "");
    setState(p.state || "");
    setPostalCode(p.postalCode || "");
    setWebsiteUrl(p.websiteUrl || "");
    setSupportEmail(p.supportEmail || "");
    setSupportPhone(p.supportPhone || "");
    setSmsUseCase(p.smsUseCase || "MARKETING");
    if (view) {
      setProfile(view);
      setEinOnFile(view.einOnFile);
      setDisclosureAccepted(view.disclosureAccepted);
      if (
        view.status === "submitted" ||
        view.status === "approval_in_progress" ||
        view.status === "approved" ||
        view.status === "choose_number" ||
        view.status === "active" ||
        view.status === "needs_attention"
      ) {
        setStep(3);
      }
    }
  }, []);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/sms/setup");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Text messaging setup is not available.");
      setLoading(false);
      return;
    }
    setUseCases(json.useCases || []);
    applyPrefill(json.prefill, json.profile);
    setLoading(false);
  }, [applyPrefill]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (
      !profile ||
      !["submitted", "approval_in_progress", "approved", "choose_number"].includes(profile.status)
    ) {
      return;
    }
    const id = window.setInterval(() => {
      void load();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [profile, load]);

  async function post(action: "save" | "submit") {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/sms/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          legalEntityName,
          dbaBrandName,
          entityType,
          street,
          city,
          state,
          postalCode,
          websiteUrl,
          supportEmail,
          supportPhone,
          smsUseCase,
          disclosureAccepted,
          ...(einBrn.trim() ? { einBrn: einBrn.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong");
        return;
      }
      if (json.profile) {
        setProfile(json.profile);
        setEinOnFile(Boolean(json.profile.einOnFile));
      }
      if (json.optInFormUrl) setOptInUrl(json.optInFormUrl);
      setInfo(json.next || "Saved.");
      setEinBrn("");
      if (action === "submit") setStep(3);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (error && !profile && step === 0 && !legalEntityName) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        {error}
      </div>
    );
  }

  const locked =
    profile &&
    ["submitted", "approval_in_progress", "approved", "choose_number", "active"].includes(
      profile.status
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {profile && (
        <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
          <p>
            Status: <strong>{profile.statusLabel}</strong>
          </p>
          <p className="text-muted-foreground">{profile.statusMessage}</p>
          {profile.attentionHint && (
            <p className="text-amber-800">{profile.attentionHint}</p>
          )}
          {optInUrl && (
            <p>
              Your text signup page:{" "}
              <a className="underline" href={optInUrl} target="_blank" rel="noreferrer">
                {optInUrl}
              </a>
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {info}
        </div>
      )}

      {!locked && (
        <>
          <ol className="flex flex-wrap gap-2 text-xs">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`rounded px-2 py-1 ${i === step ? "bg-foreground text-background" : "bg-muted"}`}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <section className="space-y-3 rounded-xl border p-4">
              <h2 className="text-sm font-semibold">Confirm your business</h2>
              <p className="text-xs text-muted-foreground">
                We filled this from your account. Edit anything that should match your legal records.
              </p>
              <Field label="Legal business name">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={legalEntityName}
                  onChange={(e) => setLegalEntityName(e.target.value)}
                />
              </Field>
              <Field label="Brand name customers see on texts">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={dbaBrandName}
                  onChange={(e) => setDbaBrandName(e.target.value)}
                />
              </Field>
              <Field label={einOnFile ? "EIN (leave blank to keep saved value)" : "EIN"}>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={einBrn}
                  onChange={(e) => setEinBrn(e.target.value)}
                  autoComplete="off"
                  placeholder={einOnFile ? "Saved securely" : "XX-XXXXXXX"}
                />
              </Field>
              <Field label="Street">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="City">
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </Field>
                <Field label="State">
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </Field>
                <Field label="ZIP">
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Website">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </Field>
              <Field label="Support email">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </Field>
              <Field label="Support phone">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                />
              </Field>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
                onClick={() => setStep(1)}
              >
                Continue
              </button>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-3 rounded-xl border p-4">
              <h2 className="text-sm font-semibold">What will you send?</h2>
              <div className="space-y-2">
                {useCases.map((u) => (
                  <label
                    key={u.id}
                    className={`flex cursor-pointer gap-3 rounded border p-3 text-sm ${
                      smsUseCase === u.id ? "border-foreground" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="useCase"
                      checked={smsUseCase === u.id}
                      onChange={() => setSmsUseCase(u.id)}
                    />
                    <span>
                      <span className="font-medium">{u.label}</span>
                      <span className="block text-xs text-muted-foreground">{u.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setStep(0)}>
                  Back
                </button>
                <button
                  type="button"
                  className="rounded bg-foreground px-4 py-2 text-sm text-background"
                  onClick={() => setStep(2)}
                >
                  Continue
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3 rounded-xl border p-4">
              <h2 className="text-sm font-semibold">How do people join your text list?</h2>
              <p className="text-sm">
                Preferred: a <strong>SendFable signup form</strong> with an explicit text-message
                consent checkbox (never checked by default).
              </p>
              <p className="text-xs text-muted-foreground">
                We’ll create this form for you automatically and include the required disclosures
                (STOP, HELP, message frequency, and Msg &amp; data rates).
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={disclosureAccepted}
                  onChange={(e) => setDisclosureAccepted(e.target.checked)}
                />
                <span>
                  I understand texts are optional, consent is not a condition of purchase, message
                  frequency varies, Msg &amp; data rates may apply, and people can reply STOP to
                  unsubscribe or HELP for help.
                </span>
              </label>
              <div className="flex gap-2">
                <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={!disclosureAccepted}
                  className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
                  onClick={() => {
                    void post("save").then(() => setStep(3));
                  }}
                >
                  Continue
                </button>
              </div>
            </section>
          )}

          {step === 3 && !locked && (
            <section className="space-y-3 rounded-xl border p-4 text-sm">
              <h2 className="font-semibold">Review</h2>
              <ul className="space-y-1 text-muted-foreground">
                <li>Business: {legalEntityName}</li>
                <li>Texts show as: {dbaBrandName}</li>
                <li>
                  Use: {useCases.find((u) => u.id === smsUseCase)?.label || smsUseCase}
                </li>
                <li>People join via: SendFable signup form</li>
                <li>Support: {supportEmail || "—"} · {supportPhone || "—"}</li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded border px-4 py-2 text-sm disabled:opacity-50"
                  onClick={() => void post("save")}
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy || !disclosureAccepted}
                  className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
                  onClick={() => void post("submit")}
                >
                  Submit for text messaging approval
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {locked && (
        <section className="space-y-3 rounded-xl border p-4 text-sm">
          <p>{profile?.statusMessage}</p>
          {profile?.status === "choose_number" && (
            <p className="text-muted-foreground">
              Number selection will appear here once registration is fully ready.
            </p>
          )}
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs"
            onClick={() => void load()}
          >
            Refresh status
          </button>
          <p className="text-xs text-muted-foreground">
            Status updates automatically — you don’t need a separate sync step.
          </p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        <Link className="underline" href="/settings">
          ← Settings
        </Link>
        {" · "}
        <Link className="underline" href="/campaigns/new">
          Campaigns
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}
