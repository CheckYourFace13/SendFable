import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact & support",
  description:
    "Contact Sendfable support with questions about your account, billing, privacy requests, or to report abuse.",
};

export default function ContactPage() {
  return (
    <div className="editorial-bg mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Support</p>
      <h1 className="mt-3 font-display text-display-md text-ink">Contact Sendfable</h1>
      <p className="mt-4 text-lg text-charcoal/75">
        Questions about your account, billing, a privacy request, or something that looks like
        abuse? Send us a message and we&apos;ll reply by email — normally within two business days.
      </p>

      <div className="mt-10">
        <ContactForm />
      </div>

      <div className="mt-10 space-y-3 text-sm text-ink/70">
        <p>
          <strong className="text-ink">Reporting spam or abuse:</strong> choose the &quot;Report
          abuse or spam&quot; topic above and include the sender address and, if possible, the full
          email headers. Abuse reports are reviewed with priority.
        </p>
        <p>
          <strong className="text-ink">Privacy and data requests:</strong> to request export or
          deletion of your data, choose the &quot;Privacy or data request&quot; topic. See our{" "}
          <a className="underline" href="/privacy">
            Privacy Policy
          </a>{" "}
          for details.
        </p>
      </div>
    </div>
  );
}
