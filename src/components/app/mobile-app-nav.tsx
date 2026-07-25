"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "@/components/app/sidebar-nav";

export function MobileAppNav({ workspaceName }: { workspaceName: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus first link in panel
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("a,button");
      first?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        aria-expanded={open}
        aria-controls={`${baseId}-panel`}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            id={`${baseId}-panel`}
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-ink text-page shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <div className="truncate text-sm font-medium">{workspaceName}</div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3" onClick={() => setOpen(false)}>
              <SidebarNav />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
