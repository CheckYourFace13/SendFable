"use client";

import { useState } from "react";
import Link from "next/link";
import type { PricingMatrixRow } from "@/data/competitors/pricing-matrix";

export function PricingMatrixTable({ rows }: { rows: PricingMatrixRow[] }) {
  const [openId, setOpenId] = useState<string | null>("sendfable");

  return (
    <>
      {/* Desktop */}
      <div className="mt-12 hidden overflow-x-auto rounded-xl border border-ink/10 md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="sticky top-0 bg-parchment text-ink/70">
            <tr>
              {[
                "Provider",
                "Free",
                "Free contacts",
                "Free sends",
                "Entry paid",
                "Contacts",
                "Sends",
                "SMS",
                "Automations",
                "Brand removal",
                "Model",
                "Best for",
                "Verified",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isSf = r.id === "sendfable";
              return (
                <tr
                  key={r.id}
                  className={`border-t border-ink/5 align-top ${
                    isSf
                      ? "bg-teal/10 ring-1 ring-inset ring-teal/30"
                      : i % 2 === 0
                        ? "bg-surface"
                        : "bg-parchment/40"
                  }`}
                >
                  <td className="sticky left-0 z-[1] bg-inherit px-3 py-3 font-semibold text-ink">
                    {r.compareHref ? (
                      <Link href={r.compareHref} className="text-coral hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      r.name
                    )}
                    {isSf && (
                      <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-teal">
                        SendFable
                      </span>
                    )}
                  </td>
                  <Cell>{r.freePlan}</Cell>
                  <Cell>{r.freeContacts}</Cell>
                  <Cell>{r.freeSends}</Cell>
                  <Cell>{r.entryPaid}</Cell>
                  <Cell>{r.includedContacts}</Cell>
                  <Cell>{r.includedSends}</Cell>
                  <Cell>{r.sms}</Cell>
                  <Cell>{r.automations}</Cell>
                  <Cell>{r.brandRemoval}</Cell>
                  <Cell>{r.pricingModel}</Cell>
                  <Cell>{r.bestFor}</Cell>
                  <td className="px-3 py-3 text-xs text-ink/60">
                    {r.lastVerified}
                    <br />
                    <a
                      href={r.pricingUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="text-coral hover:underline"
                    >
                      Official
                    </a>
                    {r.confidence !== "exact" && (
                      <span className="mt-1 block capitalize text-warning">{r.confidence}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile accordion */}
      <div className="mt-10 space-y-3 md:hidden">
        {rows.map((r) => {
          const open = openId === r.id;
          const isSf = r.id === "sendfable";
          return (
            <div
              key={r.id}
              className={`rounded-xl border ${
                isSf ? "border-teal/40 bg-teal/5" : "border-ink/10 bg-surface"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setOpenId(open ? null : r.id)}
                aria-expanded={open}
              >
                <span className="font-semibold text-ink">{r.name}</span>
                <span className="text-xs text-ink/50">{open ? "Hide" : "Details"}</span>
              </button>
              {open && (
                <dl className="space-y-2 border-t border-ink/10 px-4 py-3 text-sm">
                  <Row label="Free plan" value={r.freePlan} />
                  <Row label="Free contacts" value={r.freeContacts} />
                  <Row label="Free sends" value={r.freeSends} />
                  <Row label="Entry paid" value={r.entryPaid} />
                  <Row label="SMS" value={r.sms} />
                  <Row label="Best for" value={r.bestFor} />
                  <Row label="Verified" value={r.lastVerified} />
                  <div className="flex flex-wrap gap-3 pt-2">
                    {r.compareHref && (
                      <Link href={r.compareHref} className="text-sm font-medium text-coral">
                        Full comparison
                      </Link>
                    )}
                    <a
                      href={r.pricingUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="text-sm text-ink/60"
                    >
                      Official pricing
                    </a>
                  </div>
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="max-w-[140px] px-3 py-3 text-ink/80">{children}</td>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/55">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
