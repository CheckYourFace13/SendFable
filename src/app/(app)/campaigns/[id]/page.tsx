"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailBuilder } from "@/components/email-builder/builder";
import type { EmailDesign } from "@/lib/email-compiler";

type Identity = { id: string; value: string; displayName: string | null; status: string };
type Tag = { id: string; name: string };
type Segment = { id: string; name: string };

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");

  const load = useCallback(async () => {
    const [cRes, iRes, tRes, sRes] = await Promise.all([
      fetch(`/api/campaigns/${params.id}`),
      fetch("/api/identities"),
      fetch("/api/tags"),
      fetch("/api/segments"),
    ]);
    const cData = await cRes.json();
    if (!cRes.ok) {
      toast.error(cData.error || "Not found");
      return;
    }
    setCampaign(cData.campaign);
    setIdentities((await iRes.json()).identities || []);
    setTags((await tRes.json()).tags || []);
    setSegments((await sRes.json()).segments || []);
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!campaign) return;
    void (async () => {
      const res = await fetch(`/api/campaigns/${params.id}/audience-count`);
      const data = await res.json();
      if (res.ok) setAudienceCount(data.count);
    })();
  }, [campaign?.audienceType, campaign?.audienceTagIds, campaign?.audienceSegmentId, params.id, campaign]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/campaigns/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error || "Save failed");
      return;
    }
    setCampaign(data.campaign);
  }

  async function launch(when: "now" | "schedule") {
    const res = await fetch(`/api/campaigns/${params.id}/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        when,
        scheduledAt: when === "schedule" ? new Date(scheduleAt).toISOString() : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Launch failed");
      if (data.upgradeRequired) router.push("/billing");
      return;
    }
    toast.success(when === "now" ? "Campaign launching" : "Campaign scheduled");
    setCampaign(data.campaign);
  }

  async function control(action: "pause" | "resume" | "cancel") {
    const res = await fetch(`/api/campaigns/${params.id}/${action}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success(`Campaign ${action}d`);
    void load();
  }

  async function testSend() {
    const res = await fetch(`/api/campaigns/${params.id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Test failed");
    toast.success("Test email sent (check inbox or /tmp/outbox in dev)");
  }

  if (!campaign) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const editable = ["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status);

  return (
    <div>
      <PageHeader title={campaign.name} description={campaign.subject || "No subject yet"}>
        <Badge variant="secondary">{campaign.status}</Badge>
        {campaign.status === "COMPLETED" && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/campaigns/${campaign.id}/report`}>View report</Link>
          </Button>
        )}
        {campaign.status === "SENDING" && (
          <>
            <Button size="sm" variant="outline" onClick={() => void control("pause")}>Pause</Button>
            <Button size="sm" variant="destructive" onClick={() => void control("cancel")}>Cancel</Button>
          </>
        )}
        {campaign.status === "PAUSED" && (
          <Button size="sm" onClick={() => void control("resume")}>Resume</Button>
        )}
      </PageHeader>

      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="review">Review & send</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6 space-y-6 max-w-2xl">
          <div>
            <Label>Campaign name</Label>
            <Input
              value={campaign.name}
              disabled={!editable}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
              onBlur={() => void patch({ name: campaign.name })}
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input
              value={campaign.subject || ""}
              disabled={!editable}
              onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
              onBlur={() => void patch({ subject: campaign.subject })}
              placeholder="Your subject line"
            />
          </div>
          <div>
            <Label>Preview text</Label>
            <Input
              value={campaign.previewText || ""}
              disabled={!editable}
              onChange={(e) => setCampaign({ ...campaign, previewText: e.target.value })}
              onBlur={() => void patch({ previewText: campaign.previewText })}
            />
          </div>
          <div>
            <Label>From</Label>
            <Select
              value={campaign.senderIdentityId || ""}
              disabled={!editable}
              onValueChange={(v) => {
                setCampaign({ ...campaign, senderIdentityId: v });
                void patch({ senderIdentityId: v });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select sender" /></SelectTrigger>
              <SelectContent>
                {identities
                  .filter((i) => i.value.includes("@") && i.status === "VERIFIED")
                  .map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.displayName ? `${i.displayName} <${i.value}>` : i.value}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Audience</Label>
            <Select
              value={campaign.audienceType}
              disabled={!editable}
              onValueChange={(v) => {
                setCampaign({ ...campaign, audienceType: v });
                void patch({ audienceType: v });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subscribed contacts</SelectItem>
                <SelectItem value="tags">By tags</SelectItem>
                <SelectItem value="segment">By segment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {campaign.audienceType === "tags" && (
            <div>
              <Label>Tags</Label>
              <Select
                value={(campaign.audienceTagIds as string[])?.[0] || ""}
                onValueChange={(v) => {
                  void patch({ audienceTagIds: [v] });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
                <SelectContent>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {campaign.audienceType === "segment" && (
            <div>
              <Label>Segment</Label>
              <Select
                value={campaign.audienceSegmentId || ""}
                onValueChange={(v) => void patch({ audienceSegmentId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Estimated recipients: {audienceCount === null ? "…" : audienceCount.toLocaleString()}
          </p>
        </TabsContent>

        <TabsContent value="design" className="mt-6">
          {editable ? (
            <EmailBuilder
              initialDesign={campaign.designJson as EmailDesign}
              mailingAddress={null}
              showBadge
              previewText={campaign.previewText}
              onChange={(design, compiledHtml) => {
                setCampaign({ ...campaign, designJson: design, compiledHtml });
              }}
            />
          ) : (
            <div
              className="rounded-xl border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: campaign.compiledHtml || "" }}
            />
          )}
          {editable && (
            <div className="mt-4 flex gap-2">
              <Button
                disabled={saving}
                onClick={() =>
                  void patch({
                    designJson: campaign.designJson,
                    compiledHtml: campaign.compiledHtml,
                  })
                }
              >
                {saving ? "Saving…" : "Save design"}
              </Button>
              <Button variant="outline" onClick={() => void testSend()}>
                Send test to my email
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-6 max-w-xl space-y-4">
          <ul className="space-y-2 text-sm">
            <li>✓ Subject: {campaign.subject || <span className="text-red-600">missing</span>}</li>
            <li>✓ Sender: {campaign.senderIdentity?.value || <span className="text-red-600">missing</span>}</li>
            <li>✓ Audience: ~{audienceCount ?? "…"} recipients</li>
            <li>✓ Content: {campaign.compiledHtml ? "ready" : <span className="text-red-600">missing</span>}</li>
            <li className="text-muted-foreground">
              Spam basics: avoid ALL CAPS subjects, too many exclamation marks, and purchased lists.
            </li>
          </ul>
          {editable && campaign.status !== "SCHEDULED" && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void launch("now")}>Send now</Button>
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-xs">Schedule</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                  />
                </div>
                <Button variant="outline" disabled={!scheduleAt} onClick={() => void launch("schedule")}>
                  Schedule
                </Button>
              </div>
            </div>
          )}
          {campaign.status === "SCHEDULED" && (
            <Button variant="outline" onClick={() => void control("cancel")}>
              Cancel schedule
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
