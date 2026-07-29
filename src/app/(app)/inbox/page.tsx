/**
 * SendFable Inbox — incoming text replies.
 * Server-side gated: 404 while SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED=false.
 */

import { notFound } from "next/navigation";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled, isSmsReplyEnabled } from "@/lib/sms/flags";
import { requireWorkspaceContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { InboxList } from "@/components/sms/inbox-list";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) notFound();

  const ctx = await requireWorkspaceContext();
  const messages = await prisma.smsMessage.findMany({
    where: { workspaceId: ctx.workspace.id, direction: "INBOUND" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, smsStatus: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Text replies from your contacts. Replies you send are billed at your plan's outbound rate."
      />
      <InboxList
        replyEnabled={isSmsReplyEnabled()}
        messages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          from: m.fromE164,
          createdAt: m.createdAt.toISOString(),
          readAt: m.readAt?.toISOString() ?? null,
          isOptOut: m.isOptOutKeyword,
          contactId: m.contact?.id ?? null,
          contactName:
            [m.contact?.firstName, m.contact?.lastName].filter(Boolean).join(" ") || null,
          contactSmsStatus: m.contact?.smsStatus ?? null,
          campaignName: m.campaign?.name ?? null,
        }))}
      />
    </div>
  );
}
