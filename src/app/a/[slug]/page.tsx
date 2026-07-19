import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { sanitizeEmailHtml } from "@/lib/html-sanitize";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

async function getPublicCampaign(slug: string) {
  return prisma.campaign.findFirst({
    where: {
      publicArchive: true,
      publicSlug: slug,
      status: { in: ["COMPLETED", "SENDING"] },
    },
    include: { workspace: { select: { name: true, publicArchiveEnabled: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = await getPublicCampaign(params.slug);
  if (!campaign?.workspace.publicArchiveEnabled) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  return {
    title: `${campaign.name} · ${campaign.workspace.name}`,
    description: campaign.previewText || campaign.subject || undefined,
    robots: campaign.publicIndexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function PublicArchivePage({ params }: Props) {
  const campaign = await getPublicCampaign(params.slug);
  if (!campaign || !campaign.workspace.publicArchiveEnabled) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo className="text-lg" />
          <p className="text-sm text-muted-foreground">{campaign.workspace.name}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
        {campaign.subject && (
          <p className="mt-2 text-muted-foreground">Subject: {campaign.subject}</p>
        )}
        <div
          className="prose prose-slate mt-8 max-w-none rounded-xl border bg-white p-6"
          dangerouslySetInnerHTML={{
            __html: sanitizeEmailHtml(
              campaign.compiledHtml || "<p>No preview available.</p>",
            ),
          }}
        />
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Public archive is opt-in. Search indexing is{" "}
          {campaign.publicIndexable ? "enabled" : "disabled"} for this page.
        </p>
      </main>
    </div>
  );
}
