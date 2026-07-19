"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";

export function DashboardCharts({
  growth,
  campaigns,
}: {
  growth: Array<{ date: string; count: number }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    sentCount: number;
    openCount: number;
    clickCount: number;
    updatedAt: Date;
  }>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Audience growth (30 days)</h3>
        <div className="mt-4 h-56">
          {growth.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4F46E5"
                  fill="rgba(79,70,229,0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Import contacts to see growth
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent campaigns</h3>
          <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y">
          {campaigns.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">No campaigns yet</li>
          )}
          {campaigns.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={`/campaigns/${c.id}`} className="truncate font-medium hover:underline">
                  {c.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatDate(c.updatedAt)} · {formatNumber(c.sentCount)} sent ·{" "}
                  {formatNumber(c.openCount)} opens
                </div>
              </div>
              <Badge variant="secondary">{c.status}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
