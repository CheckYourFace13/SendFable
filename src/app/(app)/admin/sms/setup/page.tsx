"use client";

/**
 * Owner-only secure SMS compliance + pilot setup.
 * EIN never re-displayed in full after save.
 */

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import Link from "next/link";

type Profile = {
  id: string;
  workspaceId: string;
  legalEntityName: string | null;
  dbaBrandName: string | null;
  einOnFile: boolean;
  einMasked: string | null;
  entityType: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  websiteUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  industryVertical: string | null;
  smsUseCase: string | null;
  estimatedMonthlyVolume: number | null;
  optInDescription: string | null;
  optInFormUrl: string | null;
  optInEvidenceUrl: string | null;
  privacyPolicyUrl: string | null;
  smsTermsUrl: string | null;
  sampleMessage1: string | null;
  sampleMessage2: string | null;
  helpResponse: string | null;
  stopResponse: string | null;
  selectedPlan: string | null;
  disclosureAccepted: boolean;
  reviewStatus: string;
  providerStatus: string;
  brandId: string | null;
  campaignId: string | null;
  numberId: string | null;
  rejectionReason: string | null;
  pilotPhoneMasked: string | null;
  pilotPhoneOnFile: boolean;
  numberPurchaseUnlocked: boolean;
  liveSendingUnlocked: boolean;
  encryptionReady: boolean;
};

type Defaults = Record<string, string | number>;

export default function AdminSmsSetupPage() {
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [defaults, setDefaults] = useState<Defaults>({});
  const [expectedLegalName, setExpectedLegalName] = useState("iScream Studio INC");
  const [expectedNumberMonthlyUsd, setExpectedNumberMonthlyUsd] = useState(1.5);
  const [feeOneTime, setFeeOneTime] = useState(0);
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [encryptionReady, setEncryptionReady] = useState(false);

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
  const [industryVertical, setIndustryVertical] = useState("TECHNOLOGY");
  const [smsUseCase, setSmsUseCase] = useState("MARKETING");
  const [estimatedMonthlyVolume, setEstimatedMonthlyVolume] = useState(100);
  const [optInDescription, setOptInDescription] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [smsTermsUrl, setSmsTermsUrl] = useState("");
  const [optInFormUrl, setOptInFormUrl] = useState("");
  const [optInEvidenceUrl, setOptInEvidenceUrl] = useState("");
  const [sampleMessage1, setSampleMessage1] = useState("");
  const [sampleMessage2, setSampleMessage2] = useState("");
  const [helpResponse, setHelpResponse] = useState("");
  const [stopResponse, setStopResponse] = useState("");
  const [pilotPhone, setPilotPhone] = useState("");
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const applyProfile = useCallback((p: Profile | null, d: Defaults) => {
    setProfile(p);
    setLegalEntityName(p?.legalEntityName || String(d.legalEntityName || ""));
    setDbaBrandName(p?.dbaBrandName || String(d.dbaBrandName || ""));
    setEntityType(p?.entityType || String(d.entityType || "PRIVATE_PROFIT"));
    setStreet(p?.street || "");
    setCity(p?.city || "");
    setState(p?.state || "");
    setPostalCode(p?.postalCode || "");
    setWebsiteUrl(p?.websiteUrl || String(d.websiteUrl || ""));
    setSupportEmail(p?.supportEmail || String(d.supportEmail || ""));
    setSupportPhone(p?.supportPhone || "");
    setIndustryVertical(p?.industryVertical || String(d.industryVertical || "TECHNOLOGY"));
    setSmsUseCase(p?.smsUseCase || String(d.smsUseCase || "MARKETING"));
    setEstimatedMonthlyVolume(
      p?.estimatedMonthlyVolume ?? Number(d.estimatedMonthlyVolume || 100)
    );
    setOptInDescription(p?.optInDescription || String(d.optInDescription || ""));
    setPrivacyPolicyUrl(p?.privacyPolicyUrl || String(d.privacyPolicyUrl || ""));
    setSmsTermsUrl(p?.smsTermsUrl || String(d.smsTermsUrl || ""));
    setOptInFormUrl(p?.optInFormUrl || String(d.optInFormUrl || ""));
    setOptInEvidenceUrl(p?.optInEvidenceUrl || String(d.optInEvidenceUrl || ""));
    setSampleMessage1(p?.sampleMessage1 || String(d.sampleMessage1 || ""));
    setSampleMessage2(p?.sampleMessage2 || String(d.sampleMessage2 || ""));
    setHelpResponse(p?.helpResponse || String(d.helpResponse || ""));
    setStopResponse(p?.stopResponse || String(d.stopResponse || ""));
    setDisclosureAccepted(Boolean(p?.disclosureAccepted));
    setEinBrn(""); // never hydrate EIN from server
  }, []);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/sms/setup");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      setLoading(false);
      return;
    }
    setExpectedLegalName(json.expectedLegalName || "iScream Studio INC");
    setDefaults(json.defaults || {});
    setExpectedNumberMonthlyUsd(Number(json.expectedNumberMonthlyUsd || 1.5));
    setFeeOneTime(Number(json.feeEstimate?.oneTimeCents || 0) / 100);
    setActiveNumber(json.activeNumber?.phoneE164 || null);
    setEncryptionReady(Boolean(json.encryptionReady));
    applyProfile(json.profile, json.defaults || {});
    setLoading(false);
  }, [applyProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/admin/sms/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const fields = json.fields
          ? Object.entries(json.fields as Record<string, string>)
              .map(([k, v]) => `${k}: ${v}`)
              .join("; ")
          : "";
        setError([json.error, fields].filter(Boolean).join(" — "));
        if (json.profile) applyProfile(json.profile, defaults);
        return;
      }
      if (json.profile) applyProfile(json.profile, defaults);
      if (json.phoneE164) setActiveNumber(json.phoneE164);
      setInfo(json.next || "Saved.");
      if (json.action === "purchase" || json.phoneE164) await load();
    } finally {
      setBusy(false);
    }
  }

  function formPayload() {
    return {
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
      industryVertical,
      smsUseCase,
      estimatedMonthlyVolume,
      optInDescription,
      privacyPolicyUrl,
      smsTermsUrl,
      optInFormUrl,
      optInEvidenceUrl,
      sampleMessage1,
      sampleMessage2,
      helpResponse,
      stopResponse,
      disclosureAccepted,
      selectedPlan: "TEXT_ESSENTIALS",
      ...(einBrn.trim() ? { einBrn: einBrn.trim() } : {}),
      ...(pilotPhone.trim() ? { pilotPhone: pilotPhone.trim() } : {}),
    };
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (error && !profile && !encryptionReady) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}
      </div>
    );
  }

  const approved = profile?.reviewStatus === "APPROVED";
  const pending =
    profile?.reviewStatus === "PROVIDER_PENDING" ||
    profile?.reviewStatus === "PROVIDER_SUBMITTED";
  const canPurchase = Boolean(
    (approved || profile?.numberPurchaseUnlocked) && !activeNumber
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Owner SMS pilot setup"
        description="Enter legal registration data securely. EIN is encrypted at rest and never shown in full after save. Public SMS stays OFF."
      />
      <p className="text-sm">
        <Link className="underline" href="/admin/sms">
          ← SMS admin
        </Link>
      </p>

      <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
        <p>
          Encryption key:{" "}
          <strong>{encryptionReady ? "SET" : "MISSING"}</strong>
        </p>
        <p>
          Expected legal name: <strong>{expectedLegalName}</strong>
        </p>
        <p>Public SMS: still OFF</p>
        {profile && (
          <p>
            Status: <strong>{profile.reviewStatus}</strong>
            {profile.brandId ? ` · brand ${profile.brandId}` : ""}
            {profile.campaignId ? ` · campaign ${profile.campaignId}` : ""}
          </p>
        )}
        {profile?.einOnFile && (
          <p>EIN on file: {profile.einMasked || "yes (masked)"}</p>
        )}
        {profile?.pilotPhoneOnFile && (
          <p>Pilot phone on file: {profile.pilotPhoneMasked}</p>
        )}
        {activeNumber && <p>Active number: {activeNumber}</p>}
        {profile?.rejectionReason && (
          <p className="text-red-700">Reason: {profile.rejectionReason}</p>
        )}
      </div>

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

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void post({ action: "save", ...formPayload() });
        }}
      >
        <fieldset className="space-y-3 rounded-xl border p-4" disabled={busy}>
          <legend className="px-1 text-sm font-semibold">Legal entity</legend>
          <Field label="Legal business name (IRS / TCR)">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={legalEntityName}
              onChange={(e) => setLegalEntityName(e.target.value)}
              required
            />
          </Field>
          <Field label="DBA / brand display name">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={dbaBrandName}
              onChange={(e) => setDbaBrandName(e.target.value)}
              required
            />
          </Field>
          <Field
            label={
              profile?.einOnFile
                ? "EIN (leave blank to keep existing encrypted value)"
                : "EIN (XX-XXXXXXX)"
            }
          >
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={einBrn}
              onChange={(e) => setEinBrn(e.target.value)}
              autoComplete="off"
              inputMode="numeric"
              placeholder={profile?.einOnFile ? "••••••••• (on file)" : "12-3456789"}
              required={!profile?.einOnFile}
            />
          </Field>
          <Field label="Entity type">
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              {[
                "PRIVATE_PROFIT",
                "PUBLIC_PROFIT",
                "NON_PROFIT",
                "GOVERNMENT",
                "SOLE_PROPRIETOR",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Street">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </Field>
            <Field label="State">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </Field>
            <Field label="ZIP">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Website (HTTPS)">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border p-4" disabled={busy}>
          <legend className="px-1 text-sm font-semibold">Contacts & pilot</legend>
          <Field label="Support email">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Support / TCR contact phone">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              required
            />
          </Field>
          <Field
            label={
              profile?.pilotPhoneOnFile
                ? "Owner pilot phone (leave blank to keep existing)"
                : "Owner pilot phone (US, E.164 after save)"
            }
          >
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={pilotPhone}
              onChange={(e) => setPilotPhone(e.target.value)}
              placeholder={profile?.pilotPhoneMasked || "+1…"}
              required={!profile?.pilotPhoneOnFile}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border p-4" disabled={busy}>
          <legend className="px-1 text-sm font-semibold">Campaign / compliance copy</legend>
          <Field label="Industry vertical">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={industryVertical}
              onChange={(e) => setIndustryVertical(e.target.value)}
            />
          </Field>
          <Field label="SMS use case">
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={smsUseCase}
              onChange={(e) => setSmsUseCase(e.target.value)}
            >
              {["MARKETING", "MIXED", "CUSTOMER_CARE", "LOW_VOLUME_MIXED"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estimated monthly volume">
            <input
              type="number"
              className="w-full rounded border px-3 py-2 text-sm"
              value={estimatedMonthlyVolume}
              onChange={(e) => setEstimatedMonthlyVolume(Number(e.target.value))}
            />
          </Field>
          <Field label="Privacy policy URL">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={privacyPolicyUrl}
              onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
            />
          </Field>
          <Field label="SMS terms URL">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={smsTermsUrl}
              onChange={(e) => setSmsTermsUrl(e.target.value)}
            />
          </Field>
          <Field label="Opt-in form URL">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={optInFormUrl}
              onChange={(e) => setOptInFormUrl(e.target.value)}
            />
          </Field>
          <Field label="Opt-in evidence URL">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={optInEvidenceUrl}
              onChange={(e) => setOptInEvidenceUrl(e.target.value)}
            />
          </Field>
          <Field label="Opt-in / message flow description">
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              rows={4}
              value={optInDescription}
              onChange={(e) => setOptInDescription(e.target.value)}
            />
          </Field>
          <Field label="Sample message 1">
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              rows={2}
              value={sampleMessage1}
              onChange={(e) => setSampleMessage1(e.target.value)}
            />
          </Field>
          <Field label="Sample message 2">
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              rows={2}
              value={sampleMessage2}
              onChange={(e) => setSampleMessage2(e.target.value)}
            />
          </Field>
          <Field label="HELP response">
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              rows={2}
              value={helpResponse}
              onChange={(e) => setHelpResponse(e.target.value)}
            />
          </Field>
          <Field label="STOP response">
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              rows={2}
              value={stopResponse}
              onChange={(e) => setStopResponse(e.target.value)}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={disclosureAccepted}
              onChange={(e) => setDisclosureAccepted(e.target.checked)}
            />
            <span>
              I confirm dedicated number, 10DLC registration, message frequency, Msg &amp; data
              rates may apply, and consent is not a condition of purchase.
            </span>
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || !encryptionReady}
            className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
          >
            Save & validate
          </button>
          <button
            type="button"
            disabled={busy || !encryptionReady}
            className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => void post({ action: "submit-provider", ...formPayload() })}
          >
            Submit brand & campaign to Telnyx
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => void post({ action: "sync-status" })}
          >
            Sync status now
          </button>
        </div>
      </form>

      {pending && (
        <p className="text-sm text-muted-foreground">
          Registration is pending with Telnyx/TCR. The worker polls automatically — you do not need
          to watch the Telnyx portal. Use Sync status now if you want an immediate refresh.
        </p>
      )}

      {canPurchase && (
        <section className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50/50 p-4">
          <h2 className="text-sm font-semibold">Purchase pilot number</h2>
          <p className="text-sm">
            Expected monthly number cost: about{" "}
            <strong>${expectedNumberMonthlyUsd.toFixed(2)}/mo</strong> (US local SMS). Known 10DLC
            registration one-time estimate: about <strong>${feeOneTime.toFixed(2)}</strong>{" "}
            (already incurred at brand/campaign submit if charged by Telnyx).
          </p>
          <p className="text-xs text-muted-foreground">
            Purchases one US local SMS-capable number, assigns it to the SendFable Production
            messaging profile / approved campaign, and binds it to the owner workspace. Does not buy
            toll-free or premium numbers.
          </p>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-emerald-800 px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => {
              if (
                !window.confirm(
                  `Purchase ONE US local SMS number (~$${expectedNumberMonthlyUsd.toFixed(2)}/mo)?`
                )
              ) {
                return;
              }
              void post({ action: "purchase-pilot-number", confirmPurchase: true });
            }}
          >
            Purchase pilot number
          </button>
        </section>
      )}

      {activeNumber && !profile?.liveSendingUnlocked && (
        <button
          type="button"
          disabled={busy}
          className="rounded border px-4 py-2 text-sm"
          onClick={() => void post({ action: "enable-live" })}
        >
          Enable owner-pilot live SMS (PUBLIC stays OFF)
        </button>
      )}
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
