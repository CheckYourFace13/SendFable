"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_CATALOG, emailConsentText, type CatalogKey, type FormFieldDef } from "@/lib/forms/fields";

type Tag = { id: string; name: string };
type InstallTab = "hosted" | "embed" | "developer";

const CATALOG_DEFAULTS: Record<CatalogKey, { on: boolean; required: boolean }> = {
  email: { on: true, required: true },
  firstName: { on: true, required: false },
  lastName: { on: false, required: false },
  phone: { on: false, required: false },
  company: { on: false, required: false },
  zip: { on: false, required: false },
};

export default function FormDetailPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<any>(null);
  const [hostedUrl, setHostedUrl] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [audienceId, setAudienceId] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [choices, setChoices] = useState(CATALOG_DEFAULTS);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [smsConsent, setSmsConsent] = useState(false);
  const [tab, setTab] = useState<InstallTab>("hosted");
  const [showSuccess, setShowSuccess] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/forms/${params.id}`);
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Not found");
      setForm(data.form);
      setHostedUrl(data.hostedUrl);
      setEmbedCode(data.embedCode);
      setInstructions(data.instructions || "");
      setTags(data.tags || []);
      const ids = (data.form.tagIds || []) as string[];
      setAudienceId(ids[0] || "");
      setSmsConsent(Boolean(data.form.smsConsentEnabled));
      const next = { ...CATALOG_DEFAULTS };
      for (const key of Object.keys(next) as CatalogKey[]) next[key] = { on: false, required: false };
      const nextLabels: Record<string, string> = {};
      for (const field of (data.form.fields || []) as FormFieldDef[]) {
        if (field.key in next) {
          next[field.key as CatalogKey] = { on: true, required: Boolean(field.required) };
          nextLabels[field.key] = field.label;
        }
      }
      if (!next.email.on && !next.phone.on) next.email = { on: true, required: true };
      setChoices(next);
      setLabels(nextLabels);
    })();
  }, [params.id]);

  const fields = useMemo(() => {
    return FIELD_CATALOG.filter((field) => choices[field.key].on).map((field) => ({
      key: field.key,
      label: labels[field.key]?.trim() || field.label,
      type: field.type,
      required: choices[field.key].required,
    }));
  }, [choices, labels]);

  const audienceName = tags.find((tag) => tag.id === audienceId)?.name || "this audience";

  function setOn(key: CatalogKey, on: boolean) {
    setChoices((current) => {
      const next = { ...current, [key]: { ...current[key], on, required: on ? current[key].required : false } };
      if (key === "email" && !on) next.phone = { on: true, required: true };
      if (key === "email" && on && !next.phone.required) next.email = { on: true, required: true };
      if (key === "phone" && !on && next.email.on && !next.email.required) next.email = { ...next.email, required: true };
      return next;
    });
    if (key === "phone" && !on) setSmsConsent(false);
  }

  async function createAudience() {
    const name = newAudience.trim();
    if (!name) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Could not create audience");
    setTags((current) => [...current, data.tag].sort((a, b) => a.name.localeCompare(b.name)));
    setAudienceId(data.tag.id);
    setNewAudience("");
  }

  async function save() {
    const res = await fetch(`/api/forms/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        fields,
        tagIds: audienceId ? [audienceId] : [],
        smsConsentEnabled: choices.phone.on && smsConsent,
        buttonLabel: form.buttonLabel,
        successMessage: form.successMessage,
        theme: form.theme,
        doubleOptIn: form.doubleOptIn,
        hostedSlug: form.hostedSlug,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Save failed");
    toast.success("Form saved");
    const fresh = await fetch(`/api/forms/${params.id}`);
    const freshData = await fresh.json();
    if (fresh.ok) {
      setForm(freshData.form);
      setEmbedCode(freshData.embedCode);
      setInstructions(freshData.instructions || "");
      setHostedUrl(freshData.hostedUrl);
    }
  }

  async function sendTest() {
    setTestResult("");
    const res = await fetch(`/api/forms/${params.id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { email: testEmail } }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Test failed");
    const message = data.stored
      ? `Submission received. Contact added to ${audienceName}.`
      : "Submission received. This address was not added again.";
    setTestResult(message);
    toast.success(message);
  }

  function copy(value: string, label: string) {
    void navigator.clipboard.writeText(value);
    toast.success(label);
  }

  if (!form) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={form.name} description="Choose what to collect, then put the form on your website.">
        <Button onClick={() => void save()}>Save</Button>
      </PageHeader>

      <section className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">What would you like to collect?</h2>
        <div className="mt-4 space-y-3">
          {FIELD_CATALOG.map((field) => (
            <div key={field.key} className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-40 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={choices[field.key].on}
                  onChange={(e) => setOn(field.key, e.target.checked)}
                />
                {field.label}
              </label>
              {choices[field.key].on && (
                <>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={choices[field.key].required}
                      onChange={(e) =>
                        setChoices((current) => ({
                          ...current,
                          [field.key]: { ...current[field.key], required: e.target.checked },
                        }))
                      }
                    />
                    Required
                  </label>
                  <Input
                    className="h-8 max-w-48"
                    aria-label={`${field.label} label`}
                    value={labels[field.key] ?? field.label}
                    onChange={(e) => setLabels((current) => ({ ...current, [field.key]: e.target.value }))}
                  />
                </>
              )}
            </div>
          ))}
        </div>
        {choices.phone.on && (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} />
            <span>
              Ask for SMS marketing consent
              <span className="mt-1 block text-xs text-muted-foreground">
                A phone number alone does not allow marketing texts. The box is optional and starts unchecked.
              </span>
            </span>
          </label>
        )}
      </section>

      <section className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Send submissions to</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="h-10 min-w-56 rounded-md border bg-white px-3 text-sm"
            value={audienceId}
            onChange={(e) => setAudienceId(e.target.value)}
            aria-label="Audience"
          >
            <option value="">Choose an audience</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          <Input
            className="max-w-48"
            placeholder="New audience"
            value={newAudience}
            onChange={(e) => setNewAudience(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={() => void createAudience()}>+ Create audience</Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{form.name} → {audienceName}</p>
      </section>

      <section className="mb-6 grid gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2">
        <div>
          <Label>Button label</Label>
          <Input className="mt-1" value={form.buttonLabel || ""} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} />
        </div>
        <div>
          <Label>Theme</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm"
            value={form.theme || "inherit"}
            onChange={(e) => setForm({ ...form, theme: e.target.value })}
          >
            <option value="inherit">Match my website</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>Success message</Label>
          <Input className="mt-1" value={form.successMessage || ""} onChange={(e) => setForm({ ...form, successMessage: e.target.value })} />
        </div>
      </section>

      <section className="mb-6 rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Preview</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowSuccess((v) => !v)}>
            {showSuccess ? "Show form" : "Show success"}
          </Button>
        </div>
        <div className="mt-4 max-w-md rounded-xl border p-5">
          {showSuccess ? (
            <p>{form.successMessage}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{form.name}</p>
              {fields.map((field) => (
                <div key={field.key}>
                  <div>{field.label}{field.required ? " *" : ""}</div>
                  <div className="mt-1 h-9 rounded-md border" />
                </div>
              ))}
              {fields.some((field) => field.key === "email") && (
                <p className="text-xs text-muted-foreground">{emailConsentText("your business")}</p>
              )}
              {choices.phone.on && smsConsent && (
                <label className="flex gap-2 text-xs">
                  <input type="checkbox" disabled />
                  <span>I agree to receive marketing text messages. This box starts unchecked. A phone number alone is not consent.</span>
                </label>
              )}
              <div className="rounded-md bg-ink px-3 py-2 text-center text-white">{form.buttonLabel || "Subscribe"}</div>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Put this form on your website</h2>
        <div className="mt-4 flex gap-2">
          {(["hosted", "embed", "developer"] as InstallTab[]).map((item) => (
            <Button key={item} type="button" size="sm" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>
              {item === "hosted" ? "Hosted form" : item === "embed" ? "Embed on my website" : "Developer / API"}
            </Button>
          ))}
        </div>
        {tab === "hosted" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Share this link. No code required.</p>
            <Input readOnly value={hostedUrl} onFocus={(e) => e.target.select()} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => copy(hostedUrl, "Hosted form link copied")}>Copy link</Button>
              <Button type="button" variant="outline" asChild><a href={hostedUrl} target="_blank" rel="noreferrer">Open form</a></Button>
            </div>
          </div>
        )}
        {tab === "embed" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Paste this where the form should appear. It uses your site’s type. Save the form first so this matches your fields.</p>
            <Textarea readOnly rows={4} value={embedCode} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => copy(embedCode, "Embed code copied")}>Copy embed code</Button>
          </div>
        )}
        {tab === "developer" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Hand this to a developer or an AI assistant. It matches this form.</p>
            <Textarea readOnly rows={16} value={instructions} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => copy(instructions, "Instructions copied")}>Copy instructions for developer / AI</Button>
          </div>
        )}
        <div className="mt-6 border-t pt-4">
          <h3 className="font-medium">Test form</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              type="email"
              className="max-w-xs"
              placeholder="you@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button type="button" onClick={() => void sendTest()} disabled={!testEmail.includes("@")}>Send test</Button>
          </div>
          {testResult && <p className="mt-2 text-sm">{testResult}</p>}
        </div>
      </section>
    </div>
  );
}
