"use client";

/**
 * Multi-step SMS compliance onboarding (SF-019A).
 * Only mounted when ACCOUNT_SIGNUP is enabled server-side.
 * EIN is never echoed back from the API after save (einOnFile only).
 */

import { useCallback, useEffect, useState } from "react";
import { SmsPurchaseDisclosure } from "@/components/sms/purchase-disclosure";
import type { SmsPlanKey } from "@/lib/sms/pricing";

const STEPS = [
  "Plan",
  "Business",
  "Address",
  "Use case",
  "Opt-in",
  "Messages",
  "Review",
] as const;

type Step = (typeof STEPS)[number];

interface ProfileState {
  selectedPlan: SmsPlanKey | "";
  legalEntityName: string;
  dbaBrandName: string;
  einBrn: string;
  entityType: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  websiteUrl: string;
  supportEmail: string;
  supportPhone: string;
  industryVertical: string;
  smsUseCase: string;
  estimatedMonthlyVolume: string;
  optInDescription: string;
  optInFormUrl: string;
  optInEvidenceUrl: string;
  privacyPolicyUrl: string;
  smsTermsUrl: string;
  sampleMessage1: string;
  sampleMessage2: string;
  helpResponse: string;
  stopResponse: string;
  disclosureAccepted: boolean;
  reviewStatus?: string;
  einOnFile?: boolean;
  rejectionReason?: string | null;
}

const empty: ProfileState = {
  selectedPlan: "",
  legalEntityName: "",
  dbaBrandName: "",
  einBrn: "",
  entityType: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  websiteUrl: "",
  supportEmail: "",
  supportPhone: "",
  industryVertical: "",
  smsUseCase: "",
  estimatedMonthlyVolume: "",
  optInDescription: "",
  optInFormUrl: "",
  optInEvidenceUrl: "",
  privacyPolicyUrl: "",
  smsTermsUrl: "",
  sampleMessage1: "",
  sampleMessage2: "",
  helpResponse: "",
  stopResponse: "",
  disclosureAccepted: false,
};

export function SmsOnboardingClient() {
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<ProfileState>(empty);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const step = STEPS[stepIdx];

  const load = useCallback(async () => {
    const res = await fetch("/api/sms/compliance");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Unable to load");
      setLoaded(true);
      return;
    }
    const p = json.profile;
    if (p) {
      setForm((f) => ({
        ...f,
        selectedPlan: (p.selectedPlan as SmsPlanKey) || "",
        legalEntityName: p.legalEntityName || "",
        dbaBrandName: p.dbaBrandName || "",
        einBrn: "",
        entityType: p.entityType || "",
        street: p.street || "",
        city: p.city || "",
        state: p.state || "",
        postalCode: p.postalCode || "",
        country: p.country || "US",
        websiteUrl: p.websiteUrl || "",
        supportEmail: p.supportEmail || "",
        supportPhone: p.supportPhone || "",
        industryVertical: p.industryVertical || "",
        smsUseCase: p.smsUseCase || "",
        estimatedMonthlyVolume:
          p.estimatedMonthlyVolume != null ? String(p.estimatedMonthlyVolume) : "",
        optInDescription: p.optInDescription || "",
        optInFormUrl: p.optInFormUrl || "",
        optInEvidenceUrl: p.optInEvidenceUrl || "",
        privacyPolicyUrl: p.privacyPolicyUrl || "",
        smsTermsUrl: p.smsTermsUrl || "",
        sampleMessage1: p.sampleMessage1 || "",
        sampleMessage2: p.sampleMessage2 || "",
        helpResponse: p.helpResponse || "",
        stopResponse: p.stopResponse || "",
        disclosureAccepted: Boolean(p.disclosureAcceptedAt),
        reviewStatus: p.reviewStatus,
        einOnFile: p.einOnFile,
        rejectionReason: p.rejectionReason,
      }));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFields((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function savePartial(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setError("");
    const payload: Record<string, unknown> = {
      selectedPlan: form.selectedPlan || null,
      legalEntityName: form.legalEntityName || null,
      dbaBrandName: form.dbaBrandName || null,
      entityType: form.entityType || null,
      street: form.street || null,
      city: form.city || null,
      state: form.state || null,
      postalCode: form.postalCode || null,
      country: form.country || null,
      websiteUrl: form.websiteUrl || null,
      supportEmail: form.supportEmail || null,
      supportPhone: form.supportPhone || null,
      industryVertical: form.industryVertical || null,
      smsUseCase: form.smsUseCase || null,
      estimatedMonthlyVolume: form.estimatedMonthlyVolume
        ? Number(form.estimatedMonthlyVolume)
        : null,
      optInDescription: form.optInDescription || null,
      optInFormUrl: form.optInFormUrl || null,
      optInEvidenceUrl: form.optInEvidenceUrl || null,
      privacyPolicyUrl: form.privacyPolicyUrl || null,
      smsTermsUrl: form.smsTermsUrl || null,
      sampleMessage1: form.sampleMessage1 || null,
      sampleMessage2: form.sampleMessage2 || null,
      helpResponse: form.helpResponse || null,
      stopResponse: form.stopResponse || null,
      disclosureAccepted: form.disclosureAccepted,
      ...extra,
    };
    if (form.einBrn.trim()) payload.einBrn = form.einBrn.trim();

    const res = await fetch("/api/sms/compliance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Save failed");
      return false;
    }
    if (json.profile?.einOnFile) setForm((f) => ({ ...f, einOnFile: true, einBrn: "" }));
    if (json.profile?.reviewStatus) {
      setForm((f) => ({ ...f, reviewStatus: json.profile.reviewStatus }));
    }
    return true;
  }

  async function next() {
    const ok = await savePartial();
    if (!ok) return;
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }

  async function submit() {
    const ok = await savePartial({ disclosureAccepted: form.disclosureAccepted });
    if (!ok) return;
    setSaving(true);
    const res = await fetch("/api/sms/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      if (json.fields) setFields(json.fields);
      setError(json.error || "Submit failed");
      return;
    }
    setForm((f) => ({
      ...f,
      reviewStatus: json.profile?.reviewStatus,
      rejectionReason: null,
    }));
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const locked =
    form.reviewStatus &&
    !["DRAFT", "NEEDS_CUSTOMER_CHANGES"].includes(form.reviewStatus);

  const FieldErr = ({ name }: { name: string }) =>
    fields[name] ? <p className="mt-1 text-xs text-red-600">{fields[name]}</p> : null;

  return (
    <div className="space-y-6">
      {form.reviewStatus && form.reviewStatus !== "DRAFT" && (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          Status: <strong>{form.reviewStatus}</strong>
          {form.rejectionReason ? ` — ${form.rejectionReason}` : ""}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            disabled={Boolean(locked)}
            onClick={() => setStepIdx(i)}
            className={`rounded px-2 py-1 ${
              i === stepIdx ? "bg-foreground text-background" : "bg-muted"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </nav>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <fieldset disabled={Boolean(locked) || saving} className="space-y-4">
        {step === "Plan" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a plan. Activation is a one-time $99 fee. Usage is billed per outbound
              segment; incoming segments include an allowance with $0.025 overage.
            </p>
            {(["TEXT_ENTRY", "TEXT_ESSENTIALS", "TEXT_ADVANTAGE"] as SmsPlanKey[]).map((p) => (
              <label key={p} className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                <input
                  type="radio"
                  name="plan"
                  checked={form.selectedPlan === p}
                  onChange={() => set("selectedPlan", p)}
                />
                <span className="text-sm font-medium">{p.replace(/_/g, " ")}</span>
              </label>
            ))}
            <FieldErr name="selectedPlan" />
            {form.selectedPlan && (
              <SmsPurchaseDisclosure plan={form.selectedPlan} bundleEligible={false} />
            )}
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              <li>Dedicated number required</li>
              <li>Brand/campaign registration required before sending</li>
            </ul>
          </div>
        )}

        {step === "Business" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Legal business name *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.legalEntityName}
                onChange={(e) => set("legalEntityName", e.target.value)}
              />
              <FieldErr name="legalEntityName" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Brand / DBA (optional)
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.dbaBrandName}
                onChange={(e) => set("dbaBrandName", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Entity type *
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.entityType}
                onChange={(e) => set("entityType", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="PRIVATE_PROFIT">Private profit</option>
                <option value="PUBLIC_PROFIT">Public profit</option>
                <option value="NON_PROFIT">Non-profit</option>
                <option value="GOVERNMENT">Government</option>
                <option value="SOLE_PROPRIETOR">Sole proprietor</option>
              </select>
              <FieldErr name="entityType" />
            </label>
            <label className="block text-sm">
              EIN / BRN {form.einOnFile ? "(on file)" : "*"}
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.einBrn}
                placeholder={form.einOnFile ? "Leave blank to keep existing" : "XX-XXXXXXX"}
                autoComplete="off"
                onChange={(e) => set("einBrn", e.target.value)}
              />
              <FieldErr name="einBrn" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Website (HTTPS) *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.websiteUrl}
                onChange={(e) => set("websiteUrl", e.target.value)}
              />
              <FieldErr name="websiteUrl" />
            </label>
            <label className="block text-sm">
              Support email *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
              />
              <FieldErr name="supportEmail" />
            </label>
            <label className="block text-sm">
              Support phone *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.supportPhone}
                onChange={(e) => set("supportPhone", e.target.value)}
              />
              <FieldErr name="supportPhone" />
            </label>
          </div>
        )}

        {step === "Address" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Street *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
              />
              <FieldErr name="street" />
            </label>
            <label className="block text-sm">
              City *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
              <FieldErr name="city" />
            </label>
            <label className="block text-sm">
              State *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
              <FieldErr name="state" />
            </label>
            <label className="block text-sm">
              Postal code *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
              />
              <FieldErr name="postalCode" />
            </label>
          </div>
        )}

        {step === "Use case" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Industry *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.industryVertical}
                onChange={(e) => set("industryVertical", e.target.value)}
              />
              <FieldErr name="industryVertical" />
            </label>
            <label className="block text-sm">
              SMS use case *
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.smsUseCase}
                onChange={(e) => set("smsUseCase", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="MARKETING">Marketing</option>
                <option value="MIXED">Mixed</option>
                <option value="CUSTOMER_CARE">Customer care</option>
                <option value="ACCOUNT_NOTIFICATION">Account notification</option>
                <option value="DELIVERY_NOTIFICATION">Delivery notification</option>
                <option value="LOW_VOLUME_MIXED">Low volume mixed</option>
              </select>
              <FieldErr name="smsUseCase" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Estimated monthly volume (segments) *
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.estimatedMonthlyVolume}
                onChange={(e) => set("estimatedMonthlyVolume", e.target.value)}
              />
              <FieldErr name="estimatedMonthlyVolume" />
            </label>
          </div>
        )}

        {step === "Opt-in" && (
          <div className="space-y-3">
            <label className="block text-sm">
              Describe your opt-in process *
              <textarea
                className="mt-1 w-full rounded border px-3 py-2"
                rows={4}
                value={form.optInDescription}
                onChange={(e) => set("optInDescription", e.target.value)}
              />
              <FieldErr name="optInDescription" />
            </label>
            <label className="block text-sm">
              Opt-in form URL (HTTPS) *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.optInFormUrl}
                onChange={(e) => set("optInFormUrl", e.target.value)}
              />
              <FieldErr name="optInFormUrl" />
            </label>
            <label className="block text-sm">
              Opt-in screenshot / evidence URL (HTTPS) *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.optInEvidenceUrl}
                onChange={(e) => set("optInEvidenceUrl", e.target.value)}
              />
              <FieldErr name="optInEvidenceUrl" />
            </label>
            <label className="block text-sm">
              Privacy Policy URL *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.privacyPolicyUrl}
                onChange={(e) => set("privacyPolicyUrl", e.target.value)}
              />
              <FieldErr name="privacyPolicyUrl" />
            </label>
            <label className="block text-sm">
              SMS Terms URL *
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.smsTermsUrl}
                onChange={(e) => set("smsTermsUrl", e.target.value)}
              />
              <FieldErr name="smsTermsUrl" />
            </label>
            <p className="text-xs text-muted-foreground">
              SMS checkboxes must never be pre-checked. Imported phone numbers do not imply consent.
            </p>
          </div>
        )}

        {step === "Messages" && (
          <div className="space-y-3">
            <label className="block text-sm">
              Sample message 1 * (include STOP language)
              <textarea
                className="mt-1 w-full rounded border px-3 py-2"
                rows={3}
                value={form.sampleMessage1}
                onChange={(e) => set("sampleMessage1", e.target.value)}
              />
              <FieldErr name="sampleMessage1" />
            </label>
            <label className="block text-sm">
              Sample message 2 * (include Msg&amp;Data rates / frequency)
              <textarea
                className="mt-1 w-full rounded border px-3 py-2"
                rows={3}
                value={form.sampleMessage2}
                onChange={(e) => set("sampleMessage2", e.target.value)}
              />
              <FieldErr name="sampleMessage2" />
            </label>
            <label className="block text-sm">
              HELP response *
              <textarea
                className="mt-1 w-full rounded border px-3 py-2"
                rows={2}
                value={form.helpResponse}
                onChange={(e) => set("helpResponse", e.target.value)}
              />
              <FieldErr name="helpResponse" />
            </label>
            <label className="block text-sm">
              STOP response *
              <textarea
                className="mt-1 w-full rounded border px-3 py-2"
                rows={2}
                value={form.stopResponse}
                onChange={(e) => set("stopResponse", e.target.value)}
              />
              <FieldErr name="stopResponse" />
            </label>
          </div>
        )}

        {step === "Review" && (
          <div className="space-y-4 text-sm">
            <p>
              You are submitting for <strong>internal SendFable review</strong>. Carrier/provider
              submission happens only after admin approval and never while registration flags are
              off.
            </p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.disclosureAccepted}
                onChange={(e) => set("disclosureAccepted", e.target.checked)}
              />
              <span>
                I confirm a dedicated number is required, registration approval is required,
                message frequency and message/data rates apply, consent is not a condition of
                purchase, and the brand identity above matches my business.
              </span>
            </label>
            <FieldErr name="disclosureAccepted" />
          </div>
        )}
      </fieldset>

      <div className="flex gap-3">
        {stepIdx > 0 && !locked && (
          <button
            type="button"
            className="rounded border px-4 py-2 text-sm"
            onClick={() => setStepIdx((i) => i - 1)}
          >
            Back
          </button>
        )}
        {stepIdx < STEPS.length - 1 && !locked && (
          <button
            type="button"
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
            onClick={() => void next()}
            disabled={saving}
          >
            Save &amp; continue
          </button>
        )}
        {step === "Review" && !locked && (
          <button
            type="button"
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
            onClick={() => void submit()}
            disabled={saving}
          >
            Submit for internal review
          </button>
        )}
      </div>
    </div>
  );
}
