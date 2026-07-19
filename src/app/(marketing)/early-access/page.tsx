import type { Metadata } from "next";
import { EarlyAccessForm } from "@/components/marketing/early-access-form";

export const metadata: Metadata = {
  title: "Early access",
  description: "Sendfable is in early launch. Join the waitlist — public signup is temporarily closed.",
};

export default function EarlyAccessPage() {
  return (
    <div className="editorial-bg mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Early launch</p>
      <h1 className="mt-3 font-display text-display-md text-ink">
        We&apos;re still writing the first chapter.
      </h1>
      <p className="mt-4 text-lg text-charcoal/75">
        Public signup is closed while we finish delivery and billing. Join the early-access list and
        we&apos;ll invite you when your spot is ready. Already have an account?{" "}
        <a className="font-medium text-coral underline" href="/login">
          Log in
        </a>
        .
      </p>

      <div className="mt-10">
        <EarlyAccessForm />
      </div>

      <p className="mt-8 text-sm text-ink/60">
        We only use this information to evaluate early access. See our{" "}
        <a className="underline" href="/privacy">
          Privacy Policy
        </a>
        . No marketing email is sent until you are invited and delivery is enabled.
      </p>
    </div>
  );
}
