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
  const [confidence, setConfidence] = useState<any>(null);
  const [mailingAddress, setMailingAddress] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [confirmWhen, setConfirmWhen] = useState<"now" | "schedule" | null>(null);
  const [launching, setLaunching] = useState(false);
  const [tab, setTab] = useState("setup");

  const load = useCallback(async () => {
    const [cRes, iRes, tRes, sRes, wRes] = await Promise.all([
      fetch(`/api/campaigns/${params.id}`),
      fetch("/api/identities"),
      fetch("/api/tags"),
      fetch("/api/segments"),
      fetch("/api/settings/workspace"),
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
    if (wRes.ok) {
      const w = await wRes.json();
      setMailingAddress(w.workspace?.mailingAddress || null);
      setBusinessName(w.workspace?.name || null);
    }
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

  async function refreshConfidence() {
    const res = await fetch(`/api/campaigns/${params.id}/confidence`);
    const data = await res.json();
    if (res.ok) setConfidence(data);
    return data;
  }

  useEffect(() => {
    if (tab !== "review" || !campaign) return;
    void refreshConfidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, params.id]);

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
    setLaunching(true);
    const res = await fetch(`/api/campaigns/${params.id}/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        when,
        scheduledAt: when === "schedule" ? new Date(scheduleAt).toISOString() : undefined,
      }),
    });
    const data = await res.json();
    setLaunching(false);
    setConfirmWhen(null);
    if (!res.ok) {
      toast.error(data.error || "Launch failed");
      if (data.upgradeRequired) router.push("/billing");
      return;
    }
    toast.success(when === "now" ? "Campaign launching" : "Campaign scheduled");
    setCampaign(data.campaign);
  }

  async function duplicate() {
    const res = await fetch(`/api/campaigns/${params.id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Could not copy");
    toast.success("Draft copy created");
    router.push(`/campaigns/${data.campaign.id}`);
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
        <Button variant="outline" size="sm" onClick={() => void duplicate()}>
          Reuse as new draft
        </Button>
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap gap-1">
          <TabsTrigger value="setup" className="min-h-11 flex-1 sm:flex-none">Details</TabsTrigger>
          <TabsTrigger value="design" className="min-h-11 flex-1 sm:flex-none">Write email</TabsTrigger>
          <TabsTrigger value="review" className="min-h-11 flex-1 sm:flex-none">Review &amp; send</TabsTrigger>
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
            <Label>Who it&apos;s from</Label>
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
            <Label>Who receives this</Label>
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
                <SelectItem value="all">Everyone who&apos;s subscribed</SelectItem>
                <SelectItem value="tags">People with a tag</SelectItem>
                <SelectItem value="segment">A saved group</SelectItem>
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
              businessName={businessName}
              mailingAddress={mailingAddress}
              showBadge
              previewText={campaign.previewText}
              simpleMode={campaign.simpleMode !== false}
              onSimpleModeChange={(simple) => {
                setCampaign({ ...campaign, simpleMode: simple });
                void patch({ simpleMode: simple });
              }}
              onRawHtmlModeChange={(raw) => {
                setCampaign({ ...campaign, rawHtmlMode: raw });
              }}
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
                    rawHtmlMode: !!campaign.rawHtmlMode,
                    simpleMode: campaign.simpleMode !== false,
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

        <TabsContent value="review" className="mt-6 max-w-2xl space-y-4">
          {(() => {
            const sender = identities.find((i) => i.id === campaign.senderIdentityId);
            const whenLabel =
              confirmWhen === "schedule" && scheduleAt
                ? new Date(scheduleAt).toLocaleString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })
                : "Send now";
            const blockers = (confidence?.checks || []).filter(
              (c: { blocksSend?: boolean; level: string }) => c.blocksSend || c.level === "error"
            );
            const warnings = (confidence?.checks || []).filter(
              (c: { blocksSend?: boolean; level: string }) =>
                !c.blocksSend && c.level === "warning"
            );
            const oks = (confidence?.checks || []).filter(
              (c: { level: string }) => c.level === "ok"
            );
            const ready =
              confidence?.canSend &&
              blockers.length === 0 &&
              (audienceCount ?? 0) > 0;

            return (
              <>
                <div className="rounded-xl border bg-white p-5 space-y-4">
                  <h3 className="font-semibold">Before you send</h3>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Send to</dt>
                      <dd className="mt-0.5 text-lg font-semibold">
                        {audienceCount === null
                          ? "…"
                          : `${audienceCount.toLocaleString()} contact${audienceCount === 1 ? "" : "s"}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Subject</dt>
                      <dd className="mt-0.5 font-medium">{campaign.subject || "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">From</dt>
                      <dd className="mt-0.5 font-medium">
                        {sender
                          ? sender.displayName
                            ? `${sender.displayName} · ${sender.value}`
                            : sender.value
                          : "Choose a verified sender in Details"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">When</dt>
                      <dd className="mt-0.5 font-medium">
                        {confirmWhen ? whenLabel : "Choose send now or a scheduled time below"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border bg-white p-5">
                  {confidence ? (
                    ready ? (
                      <div>
                        <p className="text-lg font-semibold text-emerald-800">Ready to send</p>
                        <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                          {oks.slice(0, 6).map((c: { id: string; label: string }) => (
                            <li key={c.id}>✓ {c.label}</li>
                          ))}
                          {(audienceCount ?? 0) > 0 ? (
                            <li>✓ {audienceCount!.toLocaleString()} recipients</li>
                          ) : null}
                        </ul>
                        {warnings.length > 0 ? (
                          <ul className="mt-3 space-y-2 text-sm text-amber-900">
                            {warnings.map((c: { id: string; label: string; detail: string; fixHref?: string }) => (
                              <li key={c.id}>
                                <span className="font-medium">{c.label}</span>
                                <span className="text-ink/70"> — {c.detail}</span>
                                {c.fixHref ? (
                                  <a href={c.fixHref} className="ml-1 text-coral underline">
                                    Fix
                                  </a>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-red-800">Needs attention before sending</p>
                        <ul className="mt-3 space-y-3 text-sm">
                          {blockers.map((c: { id: string; label: string; detail: string; fixHref?: string }) => (
                            <li key={c.id} className="text-red-800">
                              <div className="font-medium">{c.label}</div>
                              <p className="text-ink/80">{c.detail}</p>
                              {c.fixHref ? (
                                <a href={c.fixHref} className="text-xs font-medium text-coral underline">
                                  Fix this
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">Checking your email…</p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3"
                    onClick={async () => {
                      await patch({
                        designJson: campaign.designJson,
                        compiledHtml: campaign.compiledHtml,
                        rawHtmlMode: !!campaign.rawHtmlMode,
                      });
                      const data = await refreshConfidence();
                      if (!data?.score && data?.error) toast.error(data.error || "Could not score");
                    }}
                  >
                    Refresh checks
                  </Button>
                </div>

                {editable && campaign.status !== "SCHEDULED" && !confirmWhen && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <Button
                      className="min-h-11"
                      onClick={() => setConfirmWhen("now")}
                      disabled={confidence ? !confidence.canSend : true}
                    >
                      Send now
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div>
                        <Label className="text-xs">Schedule (your local time)</Label>
                        <Input
                          type="datetime-local"
                          className="min-h-11"
                          value={scheduleAt}
                          onChange={(e) => setScheduleAt(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="min-h-11"
                        disabled={!scheduleAt || (confidence ? !confidence.canSend : true)}
                        onClick={() => setConfirmWhen("schedule")}
                      >
                        Schedule
                      </Button>
                    </div>
                  </div>
                )}

                {editable && confirmWhen && (
                  <div className="rounded-xl border border-coral/30 bg-coral/5 p-5 space-y-4">
                    <p className="font-medium">
                      {confirmWhen === "now"
                        ? "Send this campaign now?"
                        : `Schedule for ${whenLabel}?`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {audienceCount?.toLocaleString() ?? "—"} contacts · {campaign.subject || "No subject"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="min-h-11"
                        loading={launching}
                        onClick={() => void launch(confirmWhen)}
                      >
                        {confirmWhen === "now" ? "Send campaign" : "Confirm schedule"}
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11"
                        disabled={launching}
                        onClick={() => setConfirmWhen(null)}
                      >
                        Back to edit
                      </Button>
                    </div>
                  </div>
                )}

                {campaign.status === "SCHEDULED" && (
                  <Button variant="outline" onClick={() => void control("cancel")}>
                    Cancel schedule
                  </Button>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
