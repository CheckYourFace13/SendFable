"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface InboxItem {
  id: string;
  body: string;
  from: string;
  createdAt: string;
  readAt: string | null;
  isOptOut: boolean;
  contactId: string | null;
  contactName: string | null;
  contactSmsStatus: string | null;
  campaignName: string | null;
}

export function InboxList({
  messages,
  replyEnabled,
}: {
  messages: InboxItem[];
  replyEnabled: boolean;
}) {
  const [items, setItems] = useState(messages);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  async function markRead(id: string) {
    const res = await fetch(`/api/sms/inbox`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((m) => (m.id === id ? { ...m, readAt: new Date().toISOString() } : m))
      );
    }
  }

  async function sendReply(item: InboxItem) {
    if (!item.contactId || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/sms/inbox/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: item.contactId, body: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");
      toast.success("Reply sent");
      setReplyFor(null);
      setReplyText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setSending(false);
    }
  }

  if (!items.length) {
    return (
      <p className="rounded-xl border p-6 text-sm text-muted-foreground">
        No text replies yet. Incoming messages from your contacts will appear here, and you&apos;ll
        get an email notification for each new reply.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((m) => (
        <li
          key={m.id}
          className={`rounded-xl border p-4 ${m.readAt ? "bg-background" : "bg-muted/40"}`}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{m.contactName ?? m.from}</span>
            {!m.readAt && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-800">New</span>}
            {m.isOptOut && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">Opted out</span>
            )}
            {m.contactSmsStatus === "OPTED_OUT" && !m.isOptOut && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">SMS opted out</span>
            )}
            {m.campaignName && (
              <span className="text-xs text-muted-foreground">re: {m.campaignName}</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(m.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p>
          <div className="mt-3 flex gap-2">
            {!m.readAt && (
              <Button size="sm" variant="outline" onClick={() => void markRead(m.id)}>
                Mark read
              </Button>
            )}
            {replyEnabled && m.contactId && m.contactSmsStatus !== "OPTED_OUT" && !m.isOptOut && (
              <Button size="sm" variant="outline" onClick={() => setReplyFor(replyFor === m.id ? null : m.id)}>
                Reply
              </Button>
            )}
          </div>
          {replyFor === m.id && (
            <div className="mt-3 space-y-2">
              <textarea
                className="w-full rounded-lg border p-2 text-sm"
                rows={3}
                maxLength={1600}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply… (billed at your plan's outbound per-segment rate)"
              />
              <Button size="sm" disabled={sending || !replyText.trim()} onClick={() => void sendReply(m)}>
                {sending ? "Sending…" : "Send reply"}
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
