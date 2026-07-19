"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MailWarning } from "lucide-react";

export function VerifyEmailBanner() {
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) toast.success("Verification email sent — check your inbox.");
      else toast.error("Couldn't send. Try again in a minute.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <MailWarning className="h-4 w-4 shrink-0" />
      <span>Verify your email address to unlock sending.</span>
      <button
        onClick={resend}
        disabled={loading}
        className="font-medium underline underline-offset-2 disabled:opacity-50"
      >
        Resend verification email
      </button>
    </div>
  );
}
