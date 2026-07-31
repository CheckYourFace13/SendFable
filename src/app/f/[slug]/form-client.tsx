"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type PublicForm = {
  name: string;
  fields: { key: string; label: string; type: string; required?: boolean }[];
  collectPhone?: boolean;
  brandName?: string;
  privacyPolicyUrl?: string;
  smsTermsUrl?: string;
  smsConsentDisclosure?: string;
};

export function HostedFormClient({ slug }: { slug: string }) {
  const search = useSearchParams();
  const embed = search.get("embed") === "1";
  const [form, setForm] = useState<PublicForm | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [smsConsent, setSmsConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/forms/public/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data.form);
        const init: Record<string, string | boolean> = {};
        for (const f of data.form.fields) {
          // Never precheck SMS (or any) consent checkbox from field defs.
          init[f.key] = f.type === "checkbox" ? false : "";
        }
        setValues(init);
        setSmsConsent(false);
      }
    })();
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const fields: Record<string, string | boolean> = { ...values };
      if (showSmsConsent) {
        // Separate optional SMS consent — never inferred from phone presence.
        fields.smsConsent = smsConsent;
      }
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, fields }),
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
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        Loading form…
      </div>
    );
  }

  const hasPhoneField =
    form.collectPhone ||
    form.fields.some((f) => f.type === "phone" || f.key === "phone" || f.key === "mobile");
  const showSmsConsent = hasPhoneField;
  const visibleFields = form.fields.filter((f) => f.key !== "smsConsent");

  return (
    <div
      className={
        embed
          ? "p-4"
          : "flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4"
      }
    >
      {!embed && <Logo className="mb-8 text-2xl" />}
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        {done ? (
          <>
            <h1 className="text-xl font-semibold">
              {pending ? "Check your email" : "You're subscribed"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {pending
                ? "Click the confirmation link we just sent to complete your subscription."
                : "Thanks for joining. You'll hear from us soon."}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">{form.name}</h1>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {visibleFields.map((field) => (
                <div key={field.key}>
                  {field.type === "checkbox" ? (
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={!!values[field.key]}
                        onCheckedChange={(c) =>
                          setValues((v) => ({ ...v, [field.key]: !!c }))
                        }
                        className="mt-0.5"
                      />
                      <span>{field.label}</span>
                    </label>
                  ) : (
                    <>
                      <Label>
                        {field.label}
                        {field.required ? " *" : ""}
                      </Label>
                      <Input
                        type={
                          field.type === "email"
                            ? "email"
                            : field.type === "phone"
                              ? "tel"
                              : "text"
                        }
                        required={field.required}
                        value={String(values[field.key] || "")}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [field.key]: e.target.value }))
                        }
                      />
                    </>
                  )}
                </div>
              ))}

              {showSmsConsent && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={smsConsent}
                      onCheckedChange={(c) => setSmsConsent(!!c)}
                      className="mt-0.5"
                      // Optional — never required, never prechecked
                    />
                    <span className="leading-snug text-slate-700">
                      {form.smsConsentDisclosure ||
                        `I agree to receive text messages from ${form.brandName || "this business"}. Consent is optional.`}
                    </span>
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Optional. Email signup does not imply SMS consent.{" "}
                    {form.privacyPolicyUrl && (
                      <a className="underline" href={form.privacyPolicyUrl} target="_blank" rel="noreferrer">
                        Privacy Policy
                      </a>
                    )}
                    {form.privacyPolicyUrl && form.smsTermsUrl ? " · " : null}
                    {form.smsTermsUrl && (
                      <a className="underline" href={form.smsTermsUrl} target="_blank" rel="noreferrer">
                        SMS Terms
                      </a>
                    )}
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting…" : "Subscribe"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
