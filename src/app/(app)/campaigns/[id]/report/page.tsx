"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
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
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      setCampaign(data.campaign);
      // Load recipients via a lightweight reuse — fetch report data from campaign include
      const rRes = await fetch(`/api/campaigns/${params.id}/recipients?q=${encodeURIComponent(q)}`);
      if (rRes.ok) {
        const rData = await rRes.json();
        setRecipients(rData.recipients || []);
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

  const sent = Math.max(1, campaign.sentCount);
  const delivered = campaign.deliveredCount || campaign.sentCount;
  const stats = [
    { label: "Sent", value: formatNumber(campaign.sentCount) },
    { label: "Delivered", value: formatNumber(delivered) },
    { label: "Delivery rate", value: formatPercent(delivered / sent) },
    { label: "Opens", value: formatNumber(campaign.openCount) },
    { label: "Open rate", value: formatPercent(campaign.openCount / sent) },
    { label: "Clicks", value: formatNumber(campaign.clickCount) },
    { label: "CTR", value: formatPercent(campaign.clickCount / sent) },
    { label: "Unsubs", value: formatNumber(campaign.unsubscribeCount) },
    { label: "Bounces", value: formatNumber(campaign.bounceCount) },
    { label: "Complaints", value: formatNumber(campaign.complaintCount) },
  ];

  return (
    <div>
      <PageHeader title={campaign.name} description="Campaign performance report">
        <Badge variant="secondary">{campaign.status}</Badge>
      </PageHeader>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

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
                <Area type="monotone" dataKey="opens" stroke="#4F46E5" fill="rgba(79,70,229,0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No open events yet
            </div>
          )}
        </div>
      </div>

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

      <div className="rounded-xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-semibold">Recipient activity</h3>
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
