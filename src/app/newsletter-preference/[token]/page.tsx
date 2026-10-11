"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "", label: "Global edition (no city preference)" },
  { value: "london", label: "London" },
  { value: "istanbul", label: "Istanbul" },
  { value: "chicago", label: "Chicago" },
];

export default function NewsletterPreferencePage() {
  const params = useParams<{ token: string }>();
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/newsletter-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          destination: destination || null,
        }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Logo className="mb-8 text-2xl" />
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Newsletter destination</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Optional. Signup never requires a city. Leave this on Global unless you want a labeled
          local section when we have useful content for that destination.
        </p>
        <label className="mt-6 block text-sm font-medium" htmlFor="dest">
          Preferred destination
        </label>
        <select
          id="dest"
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          {OPTIONS.map((o) => (
            <option key={o.value || "global"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button className="mt-6 w-full" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save preference"}
        </Button>
        {status === "saved" ? (
          <p className="mt-3 text-sm text-green-700">Saved. Website visit location is separate.</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-3 text-sm text-red-600">Could not save. Check your link and try again.</p>
        ) : null}
      </div>
    </div>
  );
}
