import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BuilderMock } from "@/components/marketing/builder-mock";
import { PriceCalculator } from "@/components/marketing/price-calculator";
import { Faq } from "@/components/marketing/faq";

const FEATURES = [
  {
    title: "Drag-and-drop builder",
    body: "Blocks, merge tags, and bulletproof HTML that survives every inbox.",
  },
  {
    title: "Platform deliverability",
    body: "Amazon SES under the hood with smart From-rewrite for Gmail and Yahoo.",
  },
  {
    title: "Audience that stays clean",
    body: "CSV import, segments, signup forms, and automatic suppression.",
  },
  {
    title: "Honest pricing",
    body: "Free to start. Paid plans that cost roughly half of Mailchimp.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Send<span className="text-indigo-600">fable</span>
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Email marketing that costs half and lands better.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
              Every email tells your story — Sendfable sends thousands that read like you wrote each
              one.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Start free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
          <div className="mt-16">
            <BuilderMock />
          </div>
        </div>
      </section>

      <section className="border-t bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Half the price. Same reach.</h2>
            <p className="mt-3 text-muted-foreground">
              Drag the slider to compare Sendfable with typical Mailchimp pricing.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <PriceCalculator />
          </div>
        </div>
      </section>

      <section className="border-t bg-slate-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Built for sending</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Loved by operators</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                quote: "We cut our ESP bill in half and open rates went up after the From-rewrite.",
                name: "Jordan Lee",
                role: "Founder, Harbor Co.",
              },
              {
                quote: "The builder is fast, and I don't need a designer for every campaign.",
                name: "Sam Okonkwo",
                role: "Growth, Northwind",
              },
              {
                quote: "Finally an ESP that doesn't force Google login. We use work emails.",
                name: "Riley Chen",
                role: "Ops, Brightline",
              },
            ].map((t) => (
              <blockquote key={t.name} className="rounded-2xl border bg-slate-50/50 p-6">
                <p className="text-sm leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-white py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">FAQ</h2>
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      <section className="border-t bg-indigo-600 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Ready to send your story?</h2>
          <p className="mt-3 text-indigo-100">
            Free plan includes 2,000 emails/month. No credit card required.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link href="/signup">Create your account</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
