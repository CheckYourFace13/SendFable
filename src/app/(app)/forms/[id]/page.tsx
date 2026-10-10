"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function FormDetailPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<any>(null);
  const [hostedUrl, setHostedUrl] = useState("");
  const [embedCode, setEmbedCode] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/forms/${params.id}`);
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Not found");
      setForm(data.form);
      setHostedUrl(data.hostedUrl);
      setEmbedCode(data.embedCode);
    })();
  }, [params.id]);

  async function save() {
    const res = await fetch(`/api/forms/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        doubleOptIn: form.doubleOptIn,
        hostedSlug: form.hostedSlug,
        fields: form.fields,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Save failed");
    toast.success("Form saved");
    setForm(data.form);
  }

  if (!form) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <PageHeader title={form.name} description="Configure fields and sharing.">
        <Button onClick={() => void save()}>Save</Button>
      </PageHeader>

      <div className="mb-8 max-w-xl space-y-4 rounded-xl border bg-white p-6">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Hosted slug</Label>
          <Input
            value={form.hostedSlug}
            onChange={(e) => setForm({ ...form, hostedSlug: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Double opt-in</Label>
            <p className="text-xs text-muted-foreground">
              Require email confirmation before subscribing
            </p>
          </div>
          <Switch
            checked={form.doubleOptIn}
            onCheckedChange={(v) => setForm({ ...form, doubleOptIn: v })}
          />
        </div>
      </div>

      <div className="mb-8 max-w-xl space-y-3 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Share this form</h3>
        <p className="text-sm text-muted-foreground">
          New subscribers join only this business&apos;s audience.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(hostedUrl);
              toast.success("Hosted form link copied");
            }}
          >
            Copy hosted form link
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(embedCode);
              toast.success("Embed code copied");
            }}
          >
            Copy embed code
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={hostedUrl} target="_blank" rel="noreferrer">
              Preview form
            </a>
          </Button>
        </div>
        <div>
          <Label>Hosted page</Label>
          <Input readOnly value={hostedUrl} onFocus={(e) => e.target.select()} />
        </div>
        <div>
          <Label>Embed code</Label>
          <Textarea readOnly value={embedCode} rows={4} className="font-mono text-xs" />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-ink">Option A.</strong> Link to the hosted signup form. Paste the
            link in a button, menu, or social bio.
          </p>
          <p>
            <strong className="text-ink">Option B.</strong> Embed the form on your site. Paste the
            embed code where you want the form to appear.
          </p>
          <p>
            <strong className="text-ink">Option C.</strong> Add contacts with the SendFable API if
            you already have an integration key for this workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
