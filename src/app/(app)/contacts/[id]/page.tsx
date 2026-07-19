"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

type ContactDetail = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  source: string | null;
  customFields: Record<string, string>;
  unsubscribedAt: string | null;
  createdAt: string;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
  suppression?: { reason: string; createdAt: string } | null;
  activity?: Array<{
    campaignId: string;
    campaignName: string;
    status: string;
    sentAt: string | null;
    openedAt: string | null;
    firstClickedAt: string | null;
  }>;
};

const LOCKED = new Set(["BOUNCED", "COMPLAINED"]);

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("SUBSCRIBED");
  const [customJson, setCustomJson] = useState("{}");
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [cRes, tRes] = await Promise.all([
      fetch(`/api/contacts/${params.id}`),
      fetch("/api/tags"),
    ]);
    const cData = await cRes.json();
    if (!cRes.ok) {
      toast.error(cData.error || "Contact not found");
      router.push("/contacts");
      return;
    }
    const c = cData.contact as ContactDetail;
    setContact(c);
    setFirstName(c.firstName || "");
    setLastName(c.lastName || "");
    setStatus(c.status);
    setCustomJson(JSON.stringify(c.customFields || {}, null, 2));
    const tData = await tRes.json();
    setAllTags(tData.tags || []);
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    let customFields: Record<string, string> = {};
    try {
      customFields = JSON.parse(customJson || "{}") as Record<string, string>;
    } catch {
      return toast.error("Custom fields must be valid JSON");
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, status, customFields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Contact saved");
      setContact((prev) => (prev ? { ...prev, ...data.contact } : data.contact));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTag(tagId: string, on: boolean) {
    const res = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: on ? "tag" : "untag",
        contactIds: [params.id],
        tagId,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error || "Could not update tag");
    }
    void load();
  }

  if (!contact) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const locked = LOCKED.has(contact.status);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={contact.email}
        description="Edit details, tags, and subscription status. Hard bounces and complaints stay suppressed."
      >
        <Button asChild variant="outline">
          <Link href="/contacts">Back to audience</Link>
        </Button>
      </PageHeader>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{contact.status}</Badge>
          {contact.source && (
            <span className="text-xs text-muted-foreground">Source: {contact.source}</span>
          )}
          {contact.suppression && (
            <span className="text-xs text-red-700">
              Suppressed: {contact.suppression.reason}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>First name</Label>
            <Input className="mt-1" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input className="mt-1" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Email</Label>
          <Input className="mt-1" value={contact.email} disabled />
        </div>

        <div>
          <Label>Subscription status</Label>
          {locked ? (
            <p className="mt-2 text-sm text-amber-800">
              This contact is <strong>{contact.status}</strong> and cannot be set back to subscribed.
              Remove them from future sends automatically via suppression.
            </p>
          ) : (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBSCRIBED">Subscribed</SelectItem>
                <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
                <SelectItem value="PENDING_CONFIRM">Pending confirm</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <Label>Custom fields (JSON)</Label>
          <textarea
            className="mt-1 w-full min-h-[120px] rounded-md border px-3 py-2 font-mono text-sm"
            value={customJson}
            onChange={(e) => setCustomJson(e.target.value)}
          />
        </div>

        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Tags</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {allTags.map((t) => {
            const on = contact.tags.some((ct) => ct.tag.id === t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => void toggleTag(t.id, !on)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  on ? "border-coral bg-coral/10 text-ink" : "text-muted-foreground"
                }`}
              >
                {t.name}
              </button>
            );
          })}
          {!allTags.length && (
            <p className="text-sm text-muted-foreground">
              No tags yet. Create some on the{" "}
              <Link href="/tags" className="text-coral underline">
                Tags
              </Link>{" "}
              page.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Campaign activity</h2>
        {!contact.activity?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No campaign activity yet.</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Clicked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contact.activity.map((a) => (
                  <TableRow key={a.campaignId}>
                    <TableCell>
                      <Link className="text-coral hover:underline" href={`/campaigns/${a.campaignId}`}>
                        {a.campaignName}
                      </Link>
                    </TableCell>
                    <TableCell>{a.status}</TableCell>
                    <TableCell>{a.sentAt ? formatDateTime(a.sentAt) : "—"}</TableCell>
                    <TableCell>{a.openedAt ? formatDateTime(a.openedAt) : "—"}</TableCell>
                    <TableCell>{a.firstClickedAt ? formatDateTime(a.firstClickedAt) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
