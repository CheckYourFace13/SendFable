"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "billing", label: "Billing or refunds" },
  { value: "privacy", label: "Privacy or data request" },
  { value: "abuse", label: "Report abuse or spam" },
  { value: "security", label: "Security issue" },
  { value: "legal", label: "Legal" },
] as const;

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [websiteTrap, setWebsiteTrap] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || null, topic, message, websiteTrap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your message");
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your message");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-ink/10 bg-page p-6 text-center shadow-sm" role="status">
        <h2 className="text-lg font-semibold text-ink">Message received</h2>
        <p className="mt-2 text-sm text-ink/70">
          Thanks — we&apos;ve logged your message and will reply to <strong>{email}</strong> as soon
          as we can, normally within two business days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="relative space-y-4 rounded-xl border border-ink/10 bg-page p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ct-email">Your email *</Label>
          <Input
            id="ct-email"
            type="email"
            required
            className="mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="ct-name">Name</Label>
          <Input id="ct-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="ct-topic">Topic</Label>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger id="ct-topic" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Honeypot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="ct-company">Company</Label>
        <Input
          id="ct-company"
          tabIndex={-1}
          autoComplete="off"
          value={websiteTrap}
          onChange={(e) => setWebsiteTrap(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="ct-message">Message *</Label>
        <Textarea
          id="ct-message"
          required
          minLength={10}
          className="mt-1 min-h-32"
          placeholder="How can we help?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Sending…" : "Send message"}
      </Button>
      <p className="text-xs text-ink/55">
        We only use your details to answer this message. See our{" "}
        <a className="underline" href="/privacy">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
