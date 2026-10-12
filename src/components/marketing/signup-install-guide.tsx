import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const INLINE_EXAMPLE = `<div data-sendfable-form="your-form"></div>
<script src="https://sendfable.com/embed/form.js" async></script>`;

export const POPUP_EXAMPLE = `<div data-sendfable-form="your-form" data-display="popup" data-trigger="delay" data-delay="10" data-frequency="7d"></div>
<script src="https://sendfable.com/embed/form.js" async></script>`;

const GUIDES = [
  { href: "/integrations/wordpress", label: "WordPress" },
  { href: "/integrations/wix", label: "Wix" },
  { href: "/integrations/webflow", label: "Webflow" },
  { href: "/integrations/squarespace", label: "Squarespace" },
] as const;

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100">{code}</pre>
  );
}

export function SignupInstallGuide({
  builder,
  path,
  summary,
  need,
  inlineSteps,
  popupSteps,
  caveat,
}: {
  builder: string;
  path: string;
  summary: string;
  need: string[];
  inlineSteps: string[];
  popupSteps: string[];
  caveat?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Integrations", href: "/integrations" },
          { label: builder, href: path, current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Add a Signup Tool to {builder}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{summary}</p>
      <p className="mt-4 text-sm">
        <Link href="/forms" className="font-medium text-teal hover:underline">
          Open Signup Tools
        </Link>
        {" · "}
        <Link href="/signup" className="font-medium text-teal hover:underline">
          Start free
        </Link>
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">What you&apos;ll need</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          {need.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Inline installation</h2>
        <p className="text-slate-700">
          In Signup Tools, choose Inline, then Copy code. Paste that snippet. The example below
          uses <span className="font-medium">your-form</span> as a placeholder. Your copied code
          already has the real slug.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-slate-700">
          {inlineSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <CodeBlock code={INLINE_EXAMPLE} />
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Popup installation</h2>
        <p className="text-slate-700">
          In Signup Tools, choose Popup, set when it appears and how often, then Copy code. Add
          that snippet once on the pages where the popup should run. The script is the same file
          as Inline.
        </p>
        {caveat && <p className="text-slate-700">{caveat}</p>}
        <ol className="list-decimal space-y-2 pl-5 text-slate-700">
          {popupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <CodeBlock code={POPUP_EXAMPLE} />
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">How to test</h2>
        <ol className="list-decimal space-y-2 pl-5 text-slate-700">
          <li>Publish or update the site. An unpublished draft will not show the live snippet.</li>
          <li>Open the public page in a private window.</li>
          <li>Submit a test email. It should appear in that Signup Tool&apos;s audience.</li>
          <li>
            If the tool asks for a phone, the SMS checkbox stays separate and starts unchecked.
          </li>
          <li>Free plans show Powered by SendFable under the tool. Paid plans that remove branding do not.</li>
        </ol>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Common troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>The code shows up as text on the page. Paste it into an HTML or embed block, not a normal paragraph.</li>
          <li>Nothing changed. Publish the site, then refresh. A cached page can still show the old version.</li>
          <li>The popup appeared once and stopped. That is the frequency setting. Use a private window, or wait until the next window.</li>
          <li>A browser extension or content blocker is stopping scripts. Try another browser with extensions off.</li>
          <li>The form says it is unavailable. Copy code again from the right Signup Tool so the slug matches.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Other site builders</h2>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm">
          {GUIDES.filter((guide) => guide.href !== path).map((guide) => (
            <li key={guide.href}>
              <Link href={guide.href} className="font-medium text-teal hover:underline">
                {guide.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/integrations" className="font-medium text-teal hover:underline">
              All integrations
            </Link>
          </li>
        </ul>
      </section>

      <MarketingCta primaryHref="/signup" primaryLabel="Start free" secondaryHref="/forms" secondaryLabel="Signup Tools" />
    </div>
  );
}
