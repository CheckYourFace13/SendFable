"use client";

import { useState } from "react";
import { assessSubjectLine } from "@/lib/tools/subject-line";

export function SubjectLineTester() {
  const [subject, setSubject] = useState("");
  const result = assessSubjectLine(subject);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
      <label htmlFor="subject-line" className="block text-sm font-medium text-ink">
        Subject line
      </label>
      <input
        id="subject-line"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={200}
        autoComplete="off"
        placeholder="Saturday tasting: new saison on draft"
        className="mt-2 w-full rounded-lg border border-ink/15 bg-page px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      />
      <p className="mt-2 text-sm text-ink/60">Checked in your browser. Nothing is saved.</p>

      <div className="mt-6" aria-live="polite">
        <p className="font-display text-3xl font-bold text-ink">
          {result.rating}
          <span className="ml-3 text-lg font-normal text-ink/55">{result.score}/100</span>
        </p>
        <p className="mt-1 text-sm text-ink/60">A checklist score. Not a forecast of opens.</p>
        <h2 className="mt-6 text-lg font-semibold text-ink">What stands out</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink/80">
          {result.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        {result.examples.length > 0 && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-ink">A plainer version</h2>
            <ul className="mt-2 space-y-2 text-sm text-ink">
              {result.examples.map((example) => (
                <li key={example} className="rounded-lg bg-parchment px-3 py-2">
                  {example}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
