"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";

export default function AdminAllWorkspacesPage() {
  const [q, setQ] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load(nextQ = q, nextInternal = internalOnly) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextInternal) params.set("internal", "1");
    const res = await fetch(`/api/admin/workspaces?${params}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      return;
    }
    setRows(json.workspaces || []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="All workspaces"
        description="OWNER_ADMIN search across customer and internal workspaces."
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Search name or website"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={internalOnly}
            onChange={(e) => setInternalOnly(e.target.checked)}
          />
          Internal only
        </label>
        <button
          type="button"
          className="rounded-lg bg-ink px-3 py-2 text-sm text-page"
          onClick={() => void load()}
        >
          Search
        </button>
        <Link href="/admin/internal" className="rounded-lg border px-3 py-2 text-sm">
          Internal workspaces
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Workspace</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Contacts</th>
              <th className="px-3 py-2">Autopilot</th>
              <th className="px-3 py-2">Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.websiteUrl}</div>
                </td>
                <td className="px-3 py-3">{r.isInternal ? "INTERNAL" : "Customer"}</td>
                <td className="px-3 py-3">
                  {r.plan}
                  {r.planSource === "INTERNAL_PLAN_OVERRIDE" && (
                    <div className="text-[10px] text-amber-700">Override</div>
                  )}
                </td>
                <td className="px-3 py-3">{r.contacts}</td>
                <td className="px-3 py-3">{r.autopilotEnabled ? "ON" : "off"}</td>
                <td className="px-3 py-3 text-xs">{r.ownerEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
