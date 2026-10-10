"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminViewBanner({ workspaceName }: { workspaceName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function exitView() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/view-as", { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/internal");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <span>
        Admin viewing <strong>{workspaceName}</strong>
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void exitView()}
        className="rounded-md border border-amber-400 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100 disabled:opacity-60"
      >
        Exit Admin View
      </button>
    </div>
  );
}
