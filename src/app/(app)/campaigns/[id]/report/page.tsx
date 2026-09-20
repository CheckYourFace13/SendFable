"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPercent, formatDateTime } from "@/lib/utils";

export default function CampaignReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [smsRecipients, setSmsRecipients] = useState<any[]>([]);
  const [smsOptOuts, setSmsOptOuts] = useState(0);
  const [q, setQ] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      setCampaign(data.campaign);
      const rRes = await fetch(
        `/api/campaigns/${params.id}/recipients?q=${encodeURIComponent(q)}`
      );
      if (rRes.ok) {
        const rData = await rRes.json();
        setRecipients(rData.recipients || []);
        setSmsRecipients(rData.smsRecipients || []);
        setSmsOptOuts(rData.smsOptOuts || 0);
      }
    })();
  }, [params.id, q]);

  const opensOverTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of recipients) {
      if (!r.openedAt) continue;
      const hour = new Date(r.openedAt).toISOString().slice(0, 13) + ":00";
      map.set(hour, (map.get(hour) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, opens]) => ({ time, opens }));
  }, [recipients]);

  if (!campaign) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const sent = Math.max(1, campaign.sentCount || 0);
  const delivered = campaign.deliveredCount || campaign.sentCount || 0;
  const channel = campaign.channel || "EMAIL";
  const smsSent = campaign.smsSentCount || 0;
  const smsDelivered = campaign.smsDeliveredCount || 0;
  const smsFailed = campaign.smsFailedCount || 0;
  const smsDenom = Math.max(1, smsSent);

  const nextSteps: string[] = [];
  if (channel !== "SMS" && campaign.openCount > 0 && campaign.clickCount === 0) {
    nextSteps.push("People opened but did not click — try a clearer button or offer.");
  }
  if (channel !== "EMAIL" && smsFailed > 0) {
    nextSteps.push("Some texts failed — check numbers and carrier delivery in recipient activity.");
  }
  if (channel !== "EMAIL" && smsOptOuts > 0) {
    nextSteps.push("Recent STOP opt-outs were recorded. They stay suppressed for future texts.");
  }
  if (nextSteps.length === 0) {
    nextSteps.push(
      channel === "SMS"
        ? "Review delivery below. Create a follow-up draft when you are ready — nothing sends automatically."
        : "Review opens and clicks below. Use a follow-up draft when you want another send."
    );
  }

  const stats = [
    {
      label: "Channel",
      value: channel === "BOTH" ? "Email + Text" : channel === "SMS" ? "Text" : "Email",
    },
    ...(channel !== "SMS"
      ? [
          { label: "Email sent", value: formatNumber(campaign.sentCount) },
          { label: "Email delivered", value: formatNumber(delivered) },
          { label: "Delivery rate", value: formatPercent(delivered / sent) },
          {
            label: "Opens (estimate)",
            value: formatNumber(campaign.openCount),
            hint: "Open rates are estimates — many clients block tracking pixels.",
          },
          {
            label: "Open rate (estimate)",
            value: formatPercent(campaign.openCount / sent),
            hint: "Approximate only.",
          },
          { label: "Clicks", value: formatNumber(campaign.clickCount) },
          { label: "CTR", value: formatPercent(campaign.clickCount / sent) },
          { label: "Unsubs", value: formatNumber(campaign.unsubscribeCount) },
          { label: "Bounces", value: formatNumber(campaign.bounceCount) },
          { label: "Complaints", value: formatNumber(campaign.complaintCount) },
        ]
      : []),
    ...(channel !== "EMAIL"
      ? [
          { label: "Texts sent", value: formatNumber(smsSent) },
          { label: "Texts delivered", value: formatNumber(smsDelivered) },
          {
            label: "SMS delivery rate",
            value: formatPercent(smsDelivered / smsDenom),
          },
          { label: "Texts failed", value: formatNumber(smsFailed) },
          {
            label: "SMS opt-outs (after send)",
            value: formatNumber(smsOptOuts),
            hint: "Suppressions created since this campaign was sent.",
          },
        ]
      : []),
  ];

  async function createFollowUp(
    kind: "delivered_no_engagement" | "clicked_any" | "newly_subscribed"
  ) {
    setFollowUpLoading(kind);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Follow-up failed");
      toast.success(
        `Draft created for ~${data.recipientEstimate} contacts — it will not send until you launch.`
      );
      if (data.campaign?.id) router.push(`/campaigns/${data.campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Follow-up failed");
    } finally {
      setFollowUpLoading(null);
    }
  }

  return (
    <div>
      <PageHeader title={campaign.name} description="Campaign performance report">
        <Badge variant="secondary">{campaign.status}</Badge>
      </PageHeader>

      <div className="mb-6 rounded-xl border border-teal/20 bg-teal/5 p-4">
        <h3 className="text-sm font-semibold text-ink">How did this go?</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/75">
          {nextSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-xl font-semibold">{s.value}</div>
            {"hint" in s && s.hint ? (
              <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.hint}</div>
            ) : null}
          </div>
        ))}
      </div>

      {channel !== "SMS" && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Follow-up drafts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Creates a new draft campaign only — never sends automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!!followUpLoading}
              onClick={() => void createFollowUp("delivered_no_engagement")}
            >
              {followUpLoading === "delivered_no_engagement" ? "Creating…" : "No engagement"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!followUpLoading}
              onClick={() => void createFollowUp("clicked_any")}
            >
              {followUpLoading === "clicked_any" ? "Creating…" : "Clicked any"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!followUpLoading}
              onClick={() => void createFollowUp("newly_subscribed")}
            >
              {followUpLoading === "newly_subscribed" ? "Creating…" : "Newly subscribed"}
            </Button>
          </div>
        </div>
      )}

      {channel !== "SMS" && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Opens over time</h3>
          <div className="mt-4 h-56">
            {opensOverTime.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={opensOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="opens"
                    stroke="#0F7A72"
                    fill="rgba(15,122,114,0.15)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No open events yet
              </div>
            )}
          </div>
        </div>
      )}

      {channel !== "SMS" && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h3 className="mb-4 font-semibold">Link performance</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Unique</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaign.links || []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="max-w-md truncate">{l.url}</TableCell>
                  <TableCell>{l.clickCount}</TableCell>
                  <TableCell>{l.uniqueClickCount}</TableCell>
                </TableRow>
              ))}
              {!campaign.links?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No tracked links
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {channel !== "SMS" && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-semibold">Email recipient activity</h3>
            <Input
              className="max-w-xs"
              placeholder="Search email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Clicked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{formatDateTime(r.openedAt)}</TableCell>
                  <TableCell>{formatDateTime(r.firstClickedAt)}</TableCell>
                </TableRow>
              ))}
              {!recipients.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No email recipients
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {channel !== "EMAIL" && (
        <div className="rounded-xl border bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-semibold">Text recipient activity</h3>
            {channel === "SMS" && (
              <Input
                className="max-w-xs"
                placeholder="Search phone or email…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsRecipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.phoneE164?.slice(0, 2)}***{r.phoneE164?.slice(-4)}
                  </TableCell>
                  <TableCell>{r.contact?.email || r.contact?.firstName || "—"}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{formatDateTime(r.sentAt)}</TableCell>
                  <TableCell>{formatDateTime(r.deliveredAt)}</TableCell>
                </TableRow>
              ))}
              {!smsRecipients.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No text recipients
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
