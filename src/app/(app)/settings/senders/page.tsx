import Link from "next/link";
import { requireWorkspaceContext, getWorkspaceOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { SendersManager } from "./senders-manager";
import { platformSendDomain } from "@/lib/dmarc";

export const metadata = { title: "Sender identities" };

export default async function SendersPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const { workspace } = await requireWorkspaceContext();
  const owner = await getWorkspaceOwner(workspace.id);
  const identities = await prisma.senderIdentity.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  const fromOnboarding = searchParams?.from === "onboarding";

  return (
    <div className="mx-auto max-w-3xl">
      {fromOnboarding ? (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>You&apos;re setting up your first send. After verifying, return to continue.</p>
          <Button asChild size="sm" className="min-h-11 shrink-0">
            <Link href="/onboarding">Back to setup</Link>
          </Button>
        </div>
      ) : null}
      <PageHeader
        title="Who you're sending from"
        description="Verify the From address people will see. Reply-To stays yours."
      />
      <SendersManager
        initialIdentities={identities.map((i) => ({
          id: i.id,
          type: i.type,
          value: i.value,
          displayName: i.displayName,
          status: i.status,
          isDefault: i.isDefault,
          rewriteRequired: i.rewriteRequired,
          dkimTokens: (i.dkimTokens as string[] | null) ?? null,
        }))}
        customDomainsAllowed={PLANS[owner.plan].customDomains}
        platformDomain={platformSendDomain()}
      />
    </div>
  );
}
