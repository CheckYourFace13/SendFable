"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const BLOCKS = ["Heading", "Text", "Image", "Button", "Divider", "Footer"];
const BRAND_DOTS = ["#F26A4F", "#1E8179", "#17213B", "#DCD8F9"];

export function BuilderShowcase() {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [brand, setBrand] = useState(BRAND_DOTS[0]);

  return (
    <section id="builder-showcase" className="scroll-mt-20 border-b border-ink/10 bg-ink py-20 text-page sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Email builder
          </p>
          <h2 className="mt-3 font-display text-display-md text-page text-balance">
            Design that stays out of your way.
          </h2>
          <p className="mt-3 text-page/70">
            Blocks, brand colors, subject preview, and Send Confidence — in one calm workspace.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-xl border border-page/15 bg-page text-charcoal shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-parchment px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-coral" />
              <span className="h-2.5 w-2.5 rounded-full bg-teal" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink/25" />
              <span className="ml-2 text-sm text-ink/70">Weekend specials</span>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Preview size">
              <button
                type="button"
                aria-pressed={viewport === "desktop"}
                onClick={() => setViewport("desktop")}
                className={cn(
                  "min-h-9 rounded-md px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                  viewport === "desktop" ? "bg-ink text-page" : "bg-page text-ink/70"
                )}
              >
                Desktop
              </button>
              <button
                type="button"
                aria-pressed={viewport === "mobile"}
                onClick={() => setViewport("mobile")}
                className={cn(
                  "min-h-9 rounded-md px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                  viewport === "mobile" ? "bg-ink text-page" : "bg-page text-ink/70"
                )}
              >
                Mobile
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[140px_1fr_180px]">
            <aside className="hidden space-y-2 border-r border-ink/10 p-3 sm:block" aria-label="Content blocks">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">
                Blocks
              </p>
              {BLOCKS.map((b) => (
                <div
                  key={b}
                  className="rounded-md border border-ink/10 bg-parchment/70 px-2 py-2 text-xs text-ink"
                >
                  {b}
                </div>
              ))}
            </aside>

            <div className="bg-parchment/50 p-4 sm:p-6">
              <div
                className={cn(
                  "mx-auto space-y-3 rounded-lg border border-ink/10 bg-page p-5 shadow-sm transition-all",
                  viewport === "mobile" ? "max-w-[280px]" : "max-w-xl"
                )}
              >
                <p className="text-xs text-ink/45">
                  Subject:{" "}
                  <span className="font-medium text-ink">This weekend at the shop</span>
                </p>
                <div className="h-1.5 w-16 rounded" style={{ backgroundColor: brand }} />
                <p className="font-display text-xl text-ink">Weekend specials</p>
                <div className="h-24 rounded-md bg-lavender/50 sm:h-32" />
                <p className="text-sm leading-relaxed text-charcoal/75">
                  Fresh pastries, a new pour, and a little something for regulars.
                </p>
                <div
                  className="inline-block rounded-md px-4 py-2 text-sm font-medium text-page"
                  style={{ backgroundColor: brand }}
                >
                  See what’s on
                </div>
              </div>
            </div>

            <aside className="space-y-4 border-t border-ink/10 p-4 lg:border-l lg:border-t-0">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">
                  Brand
                </p>
                <div className="mt-2 flex gap-2" role="group" aria-label="Brand color">
                  {BRAND_DOTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Use brand color ${c}`}
                      aria-pressed={brand === c}
                      onClick={() => setBrand(c)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                        brand === c ? "border-ink scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-ink/10 bg-parchment/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">
                  Send Confidence
                </p>
                <p className="mt-1 font-display text-2xl text-teal">88</p>
                <p className="text-[11px] text-ink/55">Demo score — labeled sample</p>
              </div>
              <div className="rounded-lg border border-ink/10 bg-page p-3 text-xs text-ink/65">
                Preview text: Fresh pastries and a new pour…
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
