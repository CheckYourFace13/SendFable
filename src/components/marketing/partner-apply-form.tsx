"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PartnerApplyForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/partners/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        company: fd.get("company"),
        website: fd.get("website"),
        partnerType: fd.get("partnerType"),
        audienceNote: fd.get("audienceNote"),
        website_url: fd.get("website_url"), // honeypot
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error || "Could not submit");
      return;
    }
    setStatus("ok");
    setMessage("Thanks — we will review your application.");
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required maxLength={120} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required maxLength={200} />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" maxLength={160} />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" maxLength={200} placeholder="https://" />
        </div>
      </div>
      <div>
        <Label htmlFor="partnerType">Partner type</Label>
        <select
          id="partnerType"
          name="partnerType"
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          required
          defaultValue="designer"
        >
          <option value="designer">Web designer</option>
          <option value="agency">Small marketing agency</option>
          <option value="consultant">Freelance / consultant</option>
          <option value="restaurant_consultant">Restaurant consultant</option>
          <option value="brewery_consultant">Brewery consultant</option>
          <option value="chamber">Chamber / association</option>
          <option value="nonprofit_consultant">Nonprofit consultant</option>
          <option value="bookkeeper">Bookkeeper</option>
          <option value="msp">Managed IT</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <Label htmlFor="audienceNote">Who do you advise? (optional)</Label>
        <textarea
          id="audienceNote"
          name="audienceNote"
          maxLength={2000}
          rows={4}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      {/* honeypot */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Submitting…" : "Submit application"}
      </Button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-700" : "text-teal"}`}>{message}</p>
      )}
    </form>
  );
}
