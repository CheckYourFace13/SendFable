"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function EarlyAccessForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactCountApprox, setContactCountApprox] = useState("");
  const [currentPlatform, setCurrentPlatform] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [consent, setConsent] = useState(false);
  const [websiteTrap, setWebsiteTrap] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return toast.error("Please agree so we can contact you about access.");
    setLoading(true);
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || null,
          businessName: businessName || null,
          website: website || null,
          contactCountApprox: contactCountApprox || null,
          currentPlatform: currentPlatform || null,
          mainGoal: mainGoal || null,
          consent: true,
          websiteTrap,
          source: "early-access",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit");
      router.push(data.duplicate ? "/early-access/thanks?dup=1" : "/early-access/thanks");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="relative space-y-4 rounded-xl border border-ink/10 bg-page p-6 shadow-sm">
      <div>
        <Label htmlFor="ea-email">Email *</Label>
        <Input
          id="ea-email"
          type="email"
          required
          className="mt-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ea-first">First name</Label>
          <Input
            id="ea-first"
            className="mt-1"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ea-biz">Business name</Label>
          <Input
            id="ea-biz"
            className="mt-1"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="ea-web">Website</Label>
        <Input
          id="ea-web"
          className="mt-1"
          placeholder="https://"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      {/* Honeypot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="ea-company">Company</Label>
        <Input
          id="ea-company"
          tabIndex={-1}
          autoComplete="off"
          value={websiteTrap}
          onChange={(e) => setWebsiteTrap(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Approx. contact count</Label>
          <Select value={contactCountApprox} onValueChange={setContactCountApprox}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="under-250">Under 250</SelectItem>
              <SelectItem value="250-1k">250 – 1,000</SelectItem>
              <SelectItem value="1k-5k">1,000 – 5,000</SelectItem>
              <SelectItem value="5k-25k">5,000 – 25,000</SelectItem>
              <SelectItem value="25k-plus">25,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ea-platform">Current email platform</Label>
          <Input
            id="ea-platform"
            className="mt-1"
            placeholder="Mailchimp, none, etc."
            value={currentPlatform}
            onChange={(e) => setCurrentPlatform(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="ea-goal">Main goal</Label>
        <Textarea
          id="ea-goal"
          className="mt-1"
          placeholder="e.g. Announce events, win back customers…"
          value={mainGoal}
          onChange={(e) => setMainGoal(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-ink/80">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree Sendfable may email me about early access using the address I provided. I can ask
          to be removed anytime.
        </span>
      </label>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Submitting…" : "Request early access"}
      </Button>
    </form>
  );
}
