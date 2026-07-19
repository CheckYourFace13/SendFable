import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Brand gallery (internal)",
  description: "Internal Sendfable brand review gallery. Not for public indexing.",
  robots: { index: false, follow: false },
};

const PALETTE = [
  { name: "Story Ink", token: "ink", hex: "#17213B", className: "bg-ink text-page" },
  { name: "Ember Coral", token: "coral", hex: "#F26A4F", className: "bg-coral text-white" },
  { name: "Bookcloth Teal", token: "teal", hex: "#1E8179", className: "bg-teal text-white" },
  { name: "Parchment", token: "parchment", hex: "#F7F1E7", className: "bg-parchment text-ink" },
  { name: "Lavender", token: "lavender", hex: "#DCD8F9", className: "bg-lavender text-ink" },
  { name: "Fresh Page", token: "page", hex: "#FFFDF8", className: "bg-page text-ink border border-ink/10" },
];

const FAVICON_SIZES = [16, 24, 32, 48] as const;

export default function BrandGalleryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
        Internal · noindex
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink">Brand gallery</h1>
      <p className="mt-3 max-w-2xl text-ink/70">
        Development review surface for lockups, marks, minimum sizes, palette, type, buttons, and
        favicon scales. Not linked from public navigation.
      </p>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Lockups</h2>
        <p className="mt-2 text-sm text-ink/60">Light and dark treatments on contrasting grounds.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ink/10 bg-page p-8">
            <Logo variant="lockup" tone="light" href="" className="h-10 w-auto" />
            <p className="mt-4 text-xs text-ink/50">lockup · light · on page</p>
          </div>
          <div className="rounded-xl bg-ink p-8">
            <Logo variant="lockup" tone="dark" href="" className="h-10 w-auto" />
            <p className="mt-4 text-xs text-page/50">lockup · dark · on ink</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-parchment p-8">
            <Logo variant="wordmark" href="" className="h-8 w-auto" />
            <p className="mt-4 text-xs text-ink/50">wordmark · on parchment</p>
          </div>
          <div className="rounded-xl bg-teal p-8">
            <Logo variant="wordmark" href="" className="h-8 w-auto brightness-0 invert" />
            <p className="mt-4 text-xs text-page/70">wordmark · inverted on teal</p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Marks</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-6 rounded-xl border border-ink/10 bg-page p-8">
            <Logo variant="mark" tone="light" href="" className="h-12 w-12" />
            <div>
              <p className="text-sm font-medium text-ink">Mark · light</p>
              <p className="text-xs text-ink/50">/brand/sendfable-mark.svg</p>
            </div>
          </div>
          <div className="flex items-center gap-6 rounded-xl bg-ink p-8">
            <Logo variant="mark" tone="dark" href="" className="h-12 w-12" />
            <div>
              <p className="text-sm font-medium text-page">Mark · dark</p>
              <p className="text-xs text-page/50">/brand/sendfable-mark-dark.svg</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Minimum sizes</h2>
        <p className="mt-2 text-sm text-ink/60">
          Wordmark should stay readable at ~112px wide; mark should not drop below 24px.
        </p>
        <div className="mt-6 flex flex-wrap items-end gap-8 rounded-xl border border-ink/10 bg-page p-8">
          <div>
            <Logo variant="wordmark" href="" className="h-5 w-auto" />
            <p className="mt-2 text-xs text-ink/50">wordmark · min (~112×22)</p>
          </div>
          <div>
            <Logo variant="mark" href="" className="h-6 w-6" />
            <p className="mt-2 text-xs text-ink/50">mark · 24px</p>
          </div>
          <div>
            <Logo variant="mark" href="" className="h-4 w-4 opacity-40" />
            <p className="mt-2 text-xs text-coral">mark · avoid below 24px</p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Palette</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PALETTE.map((swatch) => (
            <div
              key={swatch.token}
              className={`rounded-xl p-5 ${swatch.className}`}
            >
              <div className="text-sm font-semibold">{swatch.name}</div>
              <div className="mt-1 text-xs opacity-80">
                {swatch.token} · {swatch.hex}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Typography</h2>
        <div className="mt-6 space-y-6 rounded-xl border border-ink/10 bg-page p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Display · Fraunces</p>
            <p className="mt-2 font-display text-4xl tracking-tight text-ink">
              Every email tells your story.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Sans · body</p>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ink/75">
              Sendfable is email marketing with Amazon SES delivery, any-email signup, drag-and-drop
              campaigns, and plans priced for small teams.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Buttons</h2>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-page p-8">
          <Button asChild className="bg-coral text-white hover:bg-coral-hover">
            <Link href="/signup">Start writing free</Link>
          </Button>
          <Button asChild variant="outline" className="border-ink/20 text-ink hover:bg-parchment">
            <Link href="/pricing">See pricing</Link>
          </Button>
          <Button asChild variant="ghost" className="text-ink hover:bg-parchment">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="bg-ink text-page hover:bg-ink-soft">
            <Link href="/features">Explore product</Link>
          </Button>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Favicon sizes</h2>
        <p className="mt-2 text-sm text-ink/60">
          Scaled from the app icon mark for review at 16 / 24 / 32 / 48.
        </p>
        <div className="mt-6 flex flex-wrap items-end gap-8 rounded-xl border border-ink/10 bg-page p-8">
          {FAVICON_SIZES.map((size) => (
            <div key={size} className="text-center">
              <div
                className="mx-auto overflow-hidden rounded-sm border border-ink/10 bg-white"
                style={{ width: size, height: size }}
              >
                <Image
                  src="/brand/sendfable-mark.svg"
                  alt=""
                  width={size}
                  height={size}
                  className="h-full w-full"
                />
              </div>
              <p className="mt-2 text-xs text-ink/50">{size}×{size}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
