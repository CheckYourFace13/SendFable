import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("text-xl font-bold tracking-tight text-foreground", className)}>
      Send<span className="text-indigo-600">fable</span>
    </Link>
  );
}
