"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";

type PublicField = { key: string; label: string; type: string; required?: boolean };
type PublicForm = {
  name: string;
  fields: PublicField[];
  smsConsentEnabled?: boolean;
  buttonLabel?: string;
  successMessage?: string;
  theme?: string;
  primaryColor?: string;
  emailConsentText?: string;
  smsConsentDisclosure?: string;
};

export function HostedFormClient({ slug }: { slug: string }) {
  const search = useSearchParams();
  const embed = search.get("embed") === "1";
  const [form, setForm] = useState<PublicForm | null>(null);
  const [token, setToken] = useState("");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [smsConsent, setSmsConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/forms/public/${slug}`);
      if (!res.ok) return;
      const data = await res.json();
      setForm(data.form);
      setToken(data.token || "");
      const init: Record<string, string | boolean> = { sf_hp: "" };
      for (const field of data.form.fields || []) init[field.key] = "";
      setValues(init);
      setSmsConsent(false);
    })();
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const fields: Record<string, string | boolean> = { ...values };
      if (form?.smsConsentEnabled) fields.smsConsent = smsConsent;
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          token,
          fields,
          attribution: {
            pageUrl: window.location.href,
            referrer: document.referrer || undefined,
            utmSource: search.get("utm_source") || undefined,
            utmMedium: search.get("utm_medium") || undefined,
            utmCampaign: search.get("utm_campaign") || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPending(!!data.pendingConfirm);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!form) {
    return <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">Loading form…</div>;
  }

  const visible = (form.fields || []).filter((field) => field.key !== "smsConsent");
  const buttonStyle = form.theme === "inherit"
    ? { background: "transparent", color: "inherit", border: "1px solid currentColor" }
    : { background: form.primaryColor || "#1B4332", color: "#fff", border: 0 };

  return (
    <div className={embed ? "p-4" : "flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4"}>
      {!embed && <Logo className="mb-8 text-2xl" />}
      <div className={`w-full max-w-md rounded-2xl border p-8 shadow-sm ${form.theme === "dark" ? "border-white/10 bg-slate-900 text-white" : "bg-white"}`}>
        {done ? (
          <>
            <h1 className="text-xl font-semibold">{pending ? "Check your email" : "You're subscribed"}</h1>
            <p className="mt-2 text-sm opacity-80">
              {pending ? "Click the confirmation link we just sent to complete your subscription." : form.successMessage}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">{form.name}</h1>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {visible.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`f-${field.key}`} className="text-sm font-medium">
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  <input
                    id={`f-${field.key}`}
                    className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                    type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                    required={field.required}
                    autoComplete={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "on"}
                    value={String(values[field.key] || "")}
                    onChange={(e) => setValues((current) => ({ ...current, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
              {visible.some((field) => field.key === "email") && form.emailConsentText && (
                <p className="text-xs opacity-70">{form.emailConsentText}</p>
              )}
              {form.smsConsentEnabled && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                  />
                  <span>
                    {form.smsConsentDisclosure} Optional — not required to submit. Unchecked by
                    default. Email signup does not imply SMS consent.
                  </span>
                </label>
              )}
              <input
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={String(values.sf_hp || "")}
                onChange={(e) => setValues((current) => ({ ...current, sf_hp: e.target.value }))}
                style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={buttonStyle}
              >
                {loading ? "Submitting…" : form.buttonLabel || "Subscribe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
