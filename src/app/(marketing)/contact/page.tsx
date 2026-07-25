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
          <strong className="text-ink">Email us directly:</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            General support &amp; billing:{" "}
            <a className="underline" href="mailto:support@sendfable.com">
              support@sendfable.com
            </a>
          </li>
          <li>
            Privacy &amp; data requests:{" "}
            <a className="underline" href="mailto:privacy@sendfable.com">
              privacy@sendfable.com
            </a>
          </li>
          <li>
            Abuse / spam reports:{" "}
            <a className="underline" href="mailto:abuse@sendfable.com">
              abuse@sendfable.com
            </a>
          </li>
          <li>
            Security:{" "}
            <a className="underline" href="mailto:security@sendfable.com">
              security@sendfable.com
            </a>
          </li>
          <li>
            Legal:{" "}
            <a className="underline" href="mailto:legal@sendfable.com">
              legal@sendfable.com
            </a>
          </li>
        </ul>
        <p>
          <strong className="text-ink">Reporting spam or abuse:</strong> email{" "}
          <a className="underline" href="mailto:abuse@sendfable.com">
            abuse@sendfable.com
          </a>{" "}
          or use the form topic &quot;Report abuse or spam&quot; and include the sender address and,
          if possible, the full email headers.
        </p>
        <p>
          <strong className="text-ink">Privacy and data requests:</strong> email{" "}
          <a className="underline" href="mailto:privacy@sendfable.com">
            privacy@sendfable.com
          </a>{" "}
          or use the form. See our{" "}
          <a className="underline" href="/privacy">
            Privacy Policy
          </a>{" "}
          for details.
        </p>
      </div>
    </div>
  );
}
