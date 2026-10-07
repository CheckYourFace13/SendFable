import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/features", label: "Features" },
  { href: "/templates", label: "Templates" },
  { href: "/automated-email-marketing", label: "Marketing Autopilot" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Start Free" },
] as const;

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Logo href="/" className="mb-8" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        That page doesn&apos;t exist
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-600">
        The link may be outdated or mistyped. Pick a destination below, or start a free account.
      </p>
      <nav
        aria-label="Helpful links"
        className="mt-8 flex max-w-lg flex-wrap items-center justify-center gap-2"
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.href === "/signup"
                ? "rounded-md bg-coral-solid px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover"
                : "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
