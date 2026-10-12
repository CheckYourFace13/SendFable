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
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/acquisition/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      return;
    }
    setProspect(json.prospect);
    const outreach = (json.prospect?.messages || []).find(
      (m: { step?: string; subject?: string }) => m.step === "INITIAL" && m.subject
    );
    if (outreach?.subject) {
      const sub = String(outreach.subject);
      setReplySubject(sub.toLowerCase().startsWith("re:") ? sub : `Re: ${sub}`);
    }
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

  async function sendCaseyReply() {
    if (!replyBody.trim() || !replySubject.trim()) {
      setSendNote("Write a subject and a message before sending.");
      return;
    }
    if (!window.confirm("Send this reply as Casey?")) return;
    setSending(true);
    setSendNote("");
    const res = await fetch(`/api/admin/acquisition/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reply_as_casey",
        subject: replySubject,
        body: replyBody,
      }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      setSendNote(json.error || "Send failed");
      return;
    }
    setReplyBody("");
    setSendNote("Sent as Casey.");
    await load();
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

      <section className="rounded-xl border bg-white p-5 text-sm space-y-3">
        <h2 className="font-semibold">Original Casey outreach</h2>
        {(prospect.messages || [])
          .filter((m: { step?: string; dryRun?: boolean }) => m.step === "INITIAL" && !m.dryRun)
          .slice(0, 1)
          .map((m: { id: string; subject?: string; bodyText?: string; status?: string }) => (
            <div key={m.id}>
              <p>
                <strong>Subject:</strong> {m.subject}
              </p>
              <p className="text-muted-foreground">{m.status}</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{m.bodyText}</pre>
            </div>
          ))}
        {(prospect.messages || []).filter(
          (m: { step?: string; dryRun?: boolean }) => m.step === "INITIAL" && !m.dryRun
        ).length === 0 && <p className="text-muted-foreground">No outreach stored.</p>}
      </section>

      <section className="rounded-xl border bg-white p-5 text-sm space-y-3">
        <h2 className="font-semibold">Inbound reply</h2>
        {(prospect.events || [])
          .filter((e: { type?: string }) => e.type === "reply")
          .map((e: { id: string; createdAt: string; meta?: { replyClass?: string; replyText?: string; fromEmail?: string } }) => (
            <div key={e.id} className="space-y-2">
              <p>
                <strong>When:</strong> {new Date(e.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Classification:</strong> {e.meta?.replyClass || prospect.replyClass || "—"}
              </p>
              <p>
                <strong>From:</strong> {e.meta?.fromEmail || prospect.contactEmail || "—"}
              </p>
              <pre className="whitespace-pre-wrap rounded-lg bg-parchment p-3 text-sm text-ink">
                {e.meta?.replyText || "The reply text was not stored with this event."}
              </pre>
              {(e.meta?.replyClass === "AUTO_REPLY" || prospect.replyClass === "AUTO_REPLY") && (
                <p>Automatic receipt. No reply needed.</p>
              )}
            </div>
          ))}
        {(prospect.events || []).filter((e: { type?: string }) => e.type === "reply").length === 0 && (
          <p className="text-muted-foreground">No inbound reply stored.</p>
        )}
      </section>

      {prospect.replyClass === "AUTO_REPLY" ? (
        <section className="rounded-xl border bg-white p-5 text-sm">
          <h2 className="font-semibold">Reply as Casey</h2>
          <p className="mt-2 text-muted-foreground">No reply needed. This was an automatic receipt.</p>
        </section>
      ) : (
      <section className="rounded-xl border bg-white p-5 text-sm space-y-3">
        <h2 className="font-semibold">Reply as Casey</h2>
        <p className="text-muted-foreground">
          Nothing sends until you press Send. This uses Casey’s address. It does not send by itself.
        </p>
        <label className="block">
          <span className="font-medium">To</span>
          <input
            className="mt-1 w-full rounded-lg border bg-parchment px-3 py-2"
            value={prospect.contactEmail || ""}
            readOnly
          />
        </label>
        <label className="block">
          <span className="font-medium">Subject</span>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={replySubject}
            onChange={(ev) => setReplySubject(ev.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-medium">Message</span>
          <textarea
            className="mt-1 min-h-36 w-full rounded-lg border px-3 py-2"
            value={replyBody}
            onChange={(ev) => setReplyBody(ev.target.value)}
            placeholder="Write Casey’s reply. Leave this blank if no reply is needed."
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={sending || !replyBody.trim()}
          onClick={() => void sendCaseyReply()}
        >
          {sending ? "Sending…" : "Send"}
        </button>
        {sendNote && <p>{sendNote}</p>}
      </section>
      )}

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
