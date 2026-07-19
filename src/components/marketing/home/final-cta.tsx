import Link from "next/link";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ink py-20 text-page sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(247,241,231,0.06) 1px, transparent 1px), linear-gradient(rgba(247,241,231,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px, 100% 28px",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="font-display text-display-lg text-page text-balance">
            Your next email starts with a blank page.
          </h2>
          <p className="mt-4 max-w-md text-lg text-page/70">
            Bring your contacts, choose a design and send your first story.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-coral text-page hover:bg-coral-hover"
          >
            <Link href="/signup">Start writing free</Link>
          </Button>
          <p className="mt-4 text-sm text-page/50">500 contacts. No credit card.</p>
        </div>

        <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
          <div className="absolute -left-4 top-6 h-48 w-36 -rotate-6 rounded-sm border-2 border-page/20 bg-parchment/20" />
          <div className="absolute -right-2 top-10 h-44 w-32 rotate-3 rounded-sm border-2 border-page/15 bg-lavender/20" />
          <div className="relative rounded-sm border-2 border-page/25 bg-page p-8 text-ink shadow-2xl">
            <NextImage
              src="/illustrations/page-turn.svg"
              alt=""
              width={160}
              height={120}
              className="mx-auto h-auto w-40"
            />
            <p className="mt-6 text-center font-display text-xl text-ink">
              Every email tells your story.
            </p>
            <div className="mx-auto mt-4 h-1 w-12 rounded bg-coral" />
            <div className="mt-6 space-y-2 opacity-40">
              <div className="h-1.5 w-full rounded bg-ink" />
              <div className="h-1.5 w-5/6 rounded bg-ink" />
              <div className="h-1.5 w-2/3 rounded bg-ink" />
            </div>
          </div>
          <NextImage
            src="/illustrations/bookmark.svg"
            alt=""
            width={36}
            height={60}
            className="absolute -right-1 top-0 h-14 w-auto"
          />
        </div>
      </div>
    </section>
  );
}
