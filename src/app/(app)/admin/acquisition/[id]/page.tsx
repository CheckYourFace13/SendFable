"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export default function AdminAcquisitionDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [prospect, setProspect] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/acquisition/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      return;
    }
    setProspect(json.prospect);
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function act(action: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/admin/acquisition/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = await res.json();
    if (!res.ok) alert(json.error || "Failed");
    else setProspect(json.prospect);
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}
      </div>
    );
  }
  if (!prospect) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={prospect.businessName}
        description={`${prospect.domain} · ${prospect.category} · score ${prospect.score}`}
      />
      <p className="text-sm">
        <Link href="/admin/acquisition" className="text-coral underline">
          ← All prospects
        </Link>
      </p>

      <div className="flex flex-wrap gap-2">
        <Badge>{prospect.status}</Badge>
        {prospect.ownerApproved && <Badge variant="secondary">approved</Badge>}
        {prospect.replyClass && <Badge variant="secondary">{prospect.replyClass}</Badge>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => void act("approve")}>
          Approve
        </button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => void act("pause")}>
          Pause
        </button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => void act("suppress")}>
          Suppress
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void act("mark_incorrect")}
        >
          Mark incorrect
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void act("mark_converted")}
        >
          Mark converted
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void act("mark_reply", { replyClass: "POSITIVE" })}
        >
          Reply: positive
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void act("mark_reply", { replyClass: "NOT_INTERESTED" })}
        >
          Reply: not interested
        </button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => void act("redraft")}>
          Redraft initial
        </button>
      </div>

      <section className="rounded-xl border bg-white p-5 text-sm space-y-2">
        <p>
          <strong>Website:</strong>{" "}
          <a className="text-coral underline" href={prospect.website} target="_blank" rel="noreferrer">
            {prospect.website}
          </a>
        </p>
        <p>
          <strong>Email:</strong> {prospect.contactEmail || "—"}
        </p>
        <p>
          <strong>Source:</strong> {prospect.sourceKind} · {prospect.sourceUrl || "—"}
        </p>
        <p>
          <strong>Why selected:</strong> {prospect.personalizationClaim || "—"}
        </p>
        <p>
          <strong>Evidence:</strong> {prospect.personalizationEvidence || "—"}
        </p>
        <p>
          <strong>Signals:</strong> {JSON.stringify(prospect.fitSignals)}
        </p>
        <p>
          <strong>Landing:</strong> {prospect.landingPagePath || "—"}
        </p>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Messages</h2>
        <ul className="mt-3 space-y-4 text-sm">
          {(prospect.messages || []).map((m: any) => (
            <li key={m.id} className="border-t pt-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{m.step}</Badge>
                <Badge>{m.status}</Badge>
                {m.dryRun && <Badge variant="secondary">dry-run</Badge>}
              </div>
              <p className="mt-1 font-medium">{m.subject}</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{m.bodyText}</pre>
            </li>
          ))}
          {(prospect.messages || []).length === 0 && (
            <li className="text-muted-foreground">No messages yet.</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Events</h2>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {(prospect.events || []).map((e: any) => (
            <li key={e.id}>
              {new Date(e.createdAt).toISOString()} · {e.type} · {JSON.stringify(e.meta)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
