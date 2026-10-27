import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { issueInquiryToken } from "@/lib/inquiry/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact & support",
  description:
    "Contact SendFable support with questions about your account, billing, privacy requests, or to report abuse. Use the form — we do not publish mailbox addresses.",
};

export default function ContactPage() {
  return (
    <div className="editorial-bg mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Support</p>
      <h1 className="mt-3 font-display text-display-md text-ink">Contact SendFable</h1>
      <p className="mt-4 text-lg text-charcoal/75">
        Questions about your account, billing, a privacy request, or something that looks like
        abuse? Use the form. We reply by email — normally within two business days.
      </p>

      <div className="mt-10">
        <ContactForm formToken={issueInquiryToken("support")} />
      </div>

      <div className="mt-10 space-y-3 text-sm text-ink/70">
        <p>
          Choose the topic that fits: general or billing, privacy, abuse, security, or legal. The
          form routes the message. We do not publish email addresses on this site.
        </p>
        <p>
          SendFable is a service operated by iScream Studio INC — that legal-entity name is used
          in contracts and legal documents, not as ordinary marketing branding. See{" "}
          <a className="underline" href="/terms">
            Terms
          </a>
          .
        </p>
        <p>
          For spam reports, include the sender address and, if possible, the full email headers.
          Privacy requests: see our{" "}
          <a className="underline" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
