/**
 * Inspect recent owner-pilot SMS traffic (masked). No secrets.
 */
import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const ws =
    process.env.SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID?.trim() ||
    "cmrry4tfe0001aqx1xw328ghq";
  const { prisma } = await import("../src/lib/prisma");
  const { parseOwnerPilotMeta } = await import("../src/lib/sms/owner-pilot-meta");

  const profile = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId: ws } });
  const meta = parseOwnerPilotMeta(profile?.internalNotes);
  const pilotMasked = meta.pilotPhoneE164
    ? meta.pilotPhoneE164.slice(0, 2) + "***" + meta.pilotPhoneE164.slice(-4)
    : null;

  const msgs = await prisma.smsMessage.findMany({
    where: { workspaceId: ws },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const contact = meta.pilotPhoneE164
    ? await prisma.contact.findFirst({
        where: { workspaceId: ws, phoneE164: meta.pilotPhoneE164 },
      })
    : null;

  const suppression = meta.pilotPhoneE164
    ? await prisma.smsSuppression.findUnique({
        where: { workspaceId_phoneE164: { workspaceId: ws, phoneE164: meta.pilotPhoneE164 } },
      })
    : null;

  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        pilotMasked,
        contact: contact
          ? {
              idShort: contact.id.slice(0, 8) + "…",
              smsStatus: contact.smsStatus,
              smsConsentAt: contact.smsConsentAt,
              smsConsentSource: contact.smsConsentSource,
            }
          : null,
        suppression: suppression
          ? { at: suppression.createdAt, reason: suppression.reason }
          : null,
        messages: msgs.map((m) => ({
          idShort: m.id.slice(0, 8) + "…",
          direction: m.direction,
          status: m.status,
          body: (m.body || "").slice(0, 120),
          createdAt: m.createdAt,
          deliveredAt: (m as any).deliveredAt ?? null,
          providerMessageId: m.providerMessageId
            ? String(m.providerMessageId).slice(0, 10) + "…"
            : null,
        })),
      },
      null,
      2
    )
  );
  await prisma.$disconnect().catch(() => {});
}

main().catch((e) => {
  console.error(JSON.stringify({ fatal: e instanceof Error ? e.message.slice(0, 400) : "unknown" }));
  process.exit(1);
});
