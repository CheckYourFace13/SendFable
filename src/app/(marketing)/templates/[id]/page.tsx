import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import {
  JsonLd,
  marketingPageMeta,
  softwareApplicationJsonLd,
} from "@/components/marketing/json-ld";
import { PLATFORM_TEMPLATES } from "@/lib/platform-templates";
import { UseTemplateCta } from "@/components/marketing/use-template-cta";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return PLATFORM_TEMPLATES.map((t) => ({ id: t.shareSlug }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const tpl = PLATFORM_TEMPLATES.find((t) => t.shareSlug === id);
  if (!tpl) return {};
  return marketingPageMeta({
    title: `${tpl.name} email template`,
    description: tpl.suggestedPreviewText,
    path: `/templates/${tpl.shareSlug}`,
  });
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const tpl = PLATFORM_TEMPLATES.find((t) => t.shareSlug === id);
  if (!tpl) notFound();

  const headline =
    (tpl.designJson.blocks.find((b) => b.type === "heading")?.props as { text?: string } | undefined)
      ?.text || tpl.name;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={softwareApplicationJsonLd()} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Templates", href: "/templates" },
          { label: tpl.name, href: `/templates/${tpl.shareSlug}`, current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-teal">{tpl.industry}</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">{tpl.name}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{tpl.suggestedPreviewText}</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-ink/10 bg-surface">
        <div className="border-b border-ink/10 bg-parchment/60 px-4 py-3 text-sm">
          <p className="text-xs text-ink/60">Suggested subject</p>
          <p className="font-medium text-ink">{tpl.suggestedSubjects[0]}</p>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <div className="h-2 w-16 rounded bg-coral" />
          <h2 className="font-display text-2xl text-ink">{headline}</h2>
          <div className="h-36 rounded-lg bg-parchment" aria-hidden />
          <p className="text-sm leading-relaxed text-charcoal/80">
            Customize the message, logo, and button in Simple Mode after you start. Merge tags like{" "}
            <code className="rounded bg-parchment px-1">{"{{first_name}}"}</code> work out of the
            box. Unsubscribe footer is required and added when you send.
          </p>
          <div className="inline-block rounded-md bg-coral-solid px-4 py-2 text-sm font-semibold text-white">
            {tpl.recommendedCta}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <UseTemplateCta slug={tpl.shareSlug} goal={tpl.goal} />
        <Button asChild variant="outline">
          <Link href="/templates">All templates</Link>
        </Button>
      </div>
    </div>
  );
}
