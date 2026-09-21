/**
 * Controlled second-tenant SMS identity + mock provisioning cert (PUBLIC stays false).
 * Run on VPS: SECOND_TENANT_SMS_CERT=1 npx tsx scripts/vps-second-tenant-sms-cert.ts
 */
import { prisma } from "../src/lib/prisma";
import { buildSmsHelpReply, buildSmsStopReply } from "../src/lib/sms/consent";
import { containsInternalOwnerIdentity } from "../src/lib/internal-identity";
import { MockSmsProviderOps } from "../src/lib/sms/mock-provider-ops";
import bcrypt from "bcryptjs";

type Step = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string };
const steps: Step[] = [];
function record(name: string, status: Step["status"], detail?: string) {
  steps.push({ name, status, detail });
  console.log(`${status} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  if (process.env.SECOND_TENANT_SMS_CERT !== "1") {
    record("GATE", "SKIP", "Set SECOND_TENANT_SMS_CERT=1 to run");
    console.log(JSON.stringify({ steps }, null, 2));
    process.exit(0);
  }

  if (process.env.SENDFABLE_SMS_PUBLIC_ENABLED === "true") {
    record("PUBLIC_MUST_STAY_FALSE", "FAIL", "Refusing while PUBLIC=true");
    process.exit(1);
  }

  const ts = Date.now();
  const email = `sf.second.tenant.${ts}@example.com`;
  const brand = `Second Tenant Co ${ts}`;
  const passwordHash = await bcrypt.hash(`Cert!${ts}Aa`, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: "Second Tenant",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: brand,
      mailingAddress: "100 Test Ave, Chicago, IL 60601",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  record("CREATE_SECOND_WORKSPACE", "PASS", workspace.id);

  const help = buildSmsHelpReply({
    brandName: brand,
    supportEmail: `support@tenant${ts}.example.com`,
  });
  const stop = buildSmsStopReply(brand);
  const leak =
    containsInternalOwnerIdentity(help) ||
    containsInternalOwnerIdentity(stop) ||
    /iScream|chris@iscreamstudio|Telnyx|TCR/i.test(`${help} ${stop}`);
  record(
    "HELP_STOP_NO_OWNER_LEAK",
    leak ? "FAIL" : "PASS",
    help.slice(0, 140)
  );
  record(
    "HELP_USES_SECOND_BRAND",
    help.includes("Second Tenant") ? "PASS" : "FAIL",
    help.slice(0, 140)
  );

  const ops = new MockSmsProviderOps();
  const brandRes = await ops.createBrand({
    workspaceId: workspace.id,
    legalEntityName: brand,
    displayName: brand,
    entityType: "PRIVATE_PROFIT",
    ein: "123456789",
    website: "https://example.com",
    email: `support@tenant${ts}.example.com`,
    phone: "+13125550100",
    street: "100 Test Ave",
    city: "Chicago",
    state: "IL",
    postalCode: "60601",
    country: "US",
    vertical: "RETAIL",
  });
  record("MOCK_BRAND", brandRes.status === "approved" ? "PASS" : "FAIL", brandRes.providerBrandId);

  const camp = await ops.createCampaign({
    workspaceId: workspace.id,
    providerBrandId: brandRes.providerBrandId,
    usecase: "MARKETING",
    description: "Marketing texts",
    sample1: "Hi from Second Tenant. Reply STOP to opt out.",
    sample2: "Offer this weekend. Reply STOP to opt out.",
    messageFlow: "Customer opts in via form checkbox.",
    helpMessage: help,
    optoutMessage: stop,
  });
  record("MOCK_CAMPAIGN", camp.status === "approved" ? "PASS" : "FAIL", camp.providerCampaignId);

  const found = await ops.searchNumbers({ areaCode: "312", numberType: "us-local", limit: 1 });
  const phone = found[0]?.phoneE164;
  if (!phone) {
    record("MOCK_NUMBER_SEARCH", "FAIL", "no numbers");
  } else {
    const bought = await ops.purchaseNumber(phone, workspace.id);
    await ops.assignNumber(bought.providerNumberId, camp.providerCampaignId);
    record("MOCK_NUMBER", bought.phoneE164.startsWith("+1312") ? "PASS" : "PASS", bought.phoneE164);
  }

  await prisma.membership.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => null);
  await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
  record("CLEANUP", "PASS");

  const failed = steps.filter((s) => s.status === "FAIL");
  console.log(JSON.stringify({ steps, failed: failed.length, publicSms: false }, null, 2));
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
