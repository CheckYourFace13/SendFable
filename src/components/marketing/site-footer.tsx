import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            Email marketing that costs half and lands better.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Product</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link href="/deliverability" className="hover:text-foreground">Deliverability</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Compare</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/vs/mailchimp" className="hover:text-foreground">Sendfable vs Mailchimp</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Legal</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sendfable. All rights reserved.
      </div>
    </footer>
  );
}
