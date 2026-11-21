"use client";

import { useState } from "react";
import { checkSpamCopy } from "@/lib/tools/spam-check";

const EXAMPLE_SUBJECT = "URGENT: Act now — limited time!!!";
const EXAMPLE_BODY = [
  "Congratulations winner!!! Buy now and click here for your risk-free, 100% free offer $$$.",
  "This is not spam. Dear friend, make money with once in a lifetime guaranteed results.",
  "Order now: https://example.com/a https://example.com/b https://example.com/c",
].join(" ");

export function SpamWordChecker() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const result = checkSpamCopy(subject, body);
  const field =
    "mt-2 w-full rounded-lg border border-ink/15 bg-page px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal";

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="spam-subject" className="block text-sm font-medium text-ink">
          Subject line
        </label>
        <button
          type="button"
          className="text-sm font-medium text-coral underline-offset-2 hover:underline"
          onClick={() => {
            setSubject(EXAMPLE_SUBJECT);
            setBody(EXAMPLE_BODY);
          }}
        >
          Load example
        </button>
      </div>
      <input
        id="spam-subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={200}
        autoComplete="off"
        className={field}
      />
      <label htmlFor="spam-body" className="mt-4 block text-sm font-medium text-ink">
        Email body
      </label>
      <textarea
        id="spam-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        maxLength={8000}
        className={field}
      />
      <p className="mt-2 text-sm text-ink/60">
        Checked in your browser. The words you paste are not stored and are not sent anywhere.
      </p>

      <div className="mt-6 space-y-6" aria-live="polite">
        <p className="text-sm text-ink/75">
          A flagged phrase is a pattern worth rewriting. It does not mean a filter will reject the
          email. Deliverability also depends on sender reputation, authentication, engagement,
          content, and what recipients do with the message.
        </p>
        <section>
          <h2 className="text-lg font-semibold text-ink">Potentially risky phrases</h2>
          {result.phrases.length === 0 ? (
            <p className="mt-2 text-sm text-ink/70">None from this short list.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {result.phrases.map((item) => (
                <li key={item.label}>
                  <span className="font-medium text-ink">{item.label}.</span>{" "}
                  <span className="text-ink/75">{item.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink">Formatting</h2>
          {result.formatting.length === 0 ? (
            <p className="mt-2 text-sm text-ink/70">No capitalization, punctuation, or link-density issues on this checklist.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {result.formatting.map((item) => (
                <li key={item.label}>
                  <span className="font-medium text-ink">{item.label}.</span>{" "}
                  <span className="text-ink/75">{item.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink">What actually helps</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink/80">
            {result.suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
