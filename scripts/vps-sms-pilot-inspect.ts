/** Quick pilot contact/sender inspect. */
import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const workspaceId =
    process.env.SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID?.trim() ||
    "cmrry4tfe0001aqx1xw328ghq";
  const { prisma } = await import("../src/lib/prisma");
  const { parseOwnerPilotMeta } = await import("../src/lib/sms/owner-pilot-meta");

  const p = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
  const m = parseOwnerPilotMeta(p?.internalNotes);
  const c = m.pilotPhoneE164
    ? await prisma.contact.findFirst({ where: { workspaceId, phoneE164: m.pilotPhoneE164 } })
    : null;
  const id = await prisma.senderIdentity.findFirst({
    where: { workspaceId, status: "VERIFIED" },
    orderBy: { isDefault: "desc" },
  });
  const w = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, mailingAddress: true },
  });
  const num = await prisma.smsNumber.findFirst({
    where: { workspaceId, status: "ACTIVE" },
  });
  const supp = m.pilotPhoneE164
    ? await prisma.smsSuppression.findFirst({
        where: { workspaceId, phoneE164: m.pilotPhoneE164 },
      })
    : null;

  console.log(
    JSON.stringify(
      {
        workspace: w,
        pilotMasked: m.pilotPhoneE164
          ? m.pilotPhoneE164.slice(0, 2) + "***" + m.pilotPhoneE164.slice(-4)
          : null,
        live: m.liveSendingUnlocked,
        inbound: m.inboundUnlocked,
        numberMasked: num
          ? num.phoneE164.slice(0, 2) + "***" + num.phoneE164.slice(-4)
          : null,
        contact: c
          ? {
              idShort: c.id.slice(0, 8),
              email: c.email ? c.email.replace(/^(.{2}).*(@.*)$/, "$1***$2") : null,
              status: c.status,
              smsStatus: c.smsStatus,
              smsConsentSource: c.smsConsentSource,
              smsConsentAt: c.smsConsentAt,
            }
          : null,
        sender: id
          ? { idShort: id.id.slice(0, 8), value: id.value.replace(/^(.{2}).*(@.*)$/, "$1***$2") }
          : null,
        suppression: supp ? { reason: supp.reason } : null,
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
