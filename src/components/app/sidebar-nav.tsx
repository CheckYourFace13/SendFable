"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListChecks,
  Send,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/contacts", label: "Audience", icon: Users },
  { href: "/contacts/migrate", label: "Migrate", icon: ArrowRightLeft },
  { href: "/segments", label: "Segments", icon: BarChart3 },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/forms", label: "Forms", icon: ListChecks },
  { href: "/library", label: "Templates", icon: FileText },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Workspace">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-coral text-page"
                : "text-page/75 hover:bg-white/10 hover:text-page"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
