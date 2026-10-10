"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WorkspaceSwitcher({
  currentId,
  currentName,
  mode,
  businesses,
  showAdminLinks,
  adminView,
}: {
  currentId: string;
  currentName: string;
  mode: "owner" | "member";
  businesses: { id: string; name: string }[];
  showAdminLinks: boolean;
  adminView: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function select(workspaceId: string) {
    if (workspaceId === currentId || busy) return;
    setBusy(true);
    try {
      const url = mode === "owner" ? "/api/admin/view-as" : "/api/workspace/select";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Couldn't switch workspace");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm font-medium text-ink outline-none hover:bg-parchment focus-visible:ring-2 focus-visible:ring-coral"
        data-testid="workspace-switcher"
      >
        <span className="truncate">{currentName}</span>
        {adminView && (
          <span className="shrink-0 text-[10px] font-normal uppercase tracking-wide text-amber-800">
            Admin view
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink/50" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {businesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            disabled={busy}
            onClick={() => void select(business.id)}
          >
            <span className="truncate">{business.name}</span>
            {business.id === currentId ? (
              <span className="ml-auto text-xs text-muted-foreground">Current</span>
            ) : null}
          </DropdownMenuItem>
        ))}
        {showAdminLinks && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/internal">Admin</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/internal?new=1">+ Add internal business</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
