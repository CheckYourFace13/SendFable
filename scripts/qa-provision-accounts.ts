/**
 * ONE-SHOT controlled QA account provisioner.
 *
 * Creates Workspace B OWNER + Workspace A ADMIN/MEMBER without opening
 * public signup. Idempotent for the three known QA emails.
 *
 * Usage (on VPS, inside app container):
 *   npx tsx scripts/qa-provision-accounts.ts
 *
 * Disable after use:
 *   touch /root/sendfable-secrets/qa-provision.DISABLED
 *
 * Does NOT: open signup, touch Stripe, send campaigns, alter launch flags,
 * or print plaintext passwords to stdout after writing the secrets file.
 */
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DISABLE_MARKER = "/root/sendfable-secrets/qa-provision.DISABLED";
const SECRETS_FILE = "/root/sendfable-secrets/qa-accounts.env";

const WORKSPACE_A_OWNER_EMAIL = "chris@iscreamstudio.com";
const WORKSPACE_B_OWNER_EMAIL = "support@sendfable.com";
const WORKSPACE_A_ADMIN_EMAIL = "legal@sendfable.com";
const WORKSPACE_A_MEMBER_EMAIL = "privacy@sendfable.com";

function randomPassword(): string {
  return `Qa-${crypto.randomBytes(18).toString("base64url")}!`;
}

async function ensureUser(opts: {
  email: string;
  name: string;
  password: string;
}): Promise<{ id: string; created: boolean }> {
  const email = opts.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(opts.password, 12);
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        emailVerified: existing.emailVerified ?? new Date(),
        name: existing.name || opts.name,
      },
    });
    return { id: existing.id, created: false };
  }
  const user = await prisma.user.create({
    data: {
      email,
      name: opts.name,
      passwordHash,
      emailVerified: new Date(),
    },
  });
  return { id: user.id, created: true };
}

async function main() {
  try {
    await fs.access(DISABLE_MARKER);
    console.error("REFUSED: qa-provision is DISABLED (" + DISABLE_MARKER + ")");
    process.exit(2);
  } catch {
    // marker absent → allowed
  }

  const ownerA = await prisma.user.findUnique({
    where: { email: WORKSPACE_A_OWNER_EMAIL },
    include: { memberships: { include: { workspace: true } } },
  });
  if (!ownerA || ownerA.memberships.length === 0) {
    throw new Error("Workspace A OWNER not found: " + WORKSPACE_A_OWNER_EMAIL);
  }
  const workspaceA = ownerA.memberships.find((m) => m.role === "OWNER")?.workspace;
  if (!workspaceA) throw new Error("Workspace A OWNER membership missing");

  const pwB = randomPassword();
  const pwAdmin = randomPassword();
  const pwMember = randomPassword();

  const userB = await ensureUser({
    email: WORKSPACE_B_OWNER_EMAIL,
    name: "SendFable Support (QA B)",
    password: pwB,
  });
  const userAdmin = await ensureUser({
    email: WORKSPACE_A_ADMIN_EMAIL,
    name: "SendFable Legal (QA Admin)",
    password: pwAdmin,
  });
  const userMember = await ensureUser({
    email: WORKSPACE_A_MEMBER_EMAIL,
    name: "SendFable Privacy (QA Member)",
    password: pwMember,
  });

  let workspaceB = (
    await prisma.membership.findFirst({
      where: { userId: userB.id, role: "OWNER" },
      include: { workspace: true },
    })
  )?.workspace;

  if (!workspaceB) {
    workspaceB = await prisma.workspace.create({
      data: {
        name: "SendFable QA Workspace B",
        mailingAddress: "QA only — iScream Studio",
        onboardingCompletedAt: new Date(),
        memberships: {
          create: { userId: userB.id, role: "OWNER" },
        },
      },
    });
  }

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: userAdmin.id,
        workspaceId: workspaceA.id,
      },
    },
    create: {
      userId: userAdmin.id,
      workspaceId: workspaceA.id,
      role: "ADMIN",
    },
    update: { role: "ADMIN" },
  });

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: userMember.id,
        workspaceId: workspaceA.id,
      },
    },
    create: {
      userId: userMember.id,
      workspaceId: workspaceA.id,
      role: "MEMBER",
    },
    update: { role: "MEMBER" },
  });

  await fs.mkdir(path.dirname(SECRETS_FILE), { recursive: true, mode: 0o700 });
  const secrets = [
    `# Generated ${new Date().toISOString()} — chmod 600; never commit`,
    `QA_WORKSPACE_A_ID=${workspaceA.id}`,
    `QA_WORKSPACE_B_ID=${workspaceB.id}`,
    `QA_OWNER_A_EMAIL=${WORKSPACE_A_OWNER_EMAIL}`,
    `QA_OWNER_A_USER_ID=${ownerA.id}`,
    `QA_OWNER_B_EMAIL=${WORKSPACE_B_OWNER_EMAIL}`,
    `QA_OWNER_B_USER_ID=${userB.id}`,
    `QA_OWNER_B_PASSWORD=${pwB}`,
    `QA_ADMIN_EMAIL=${WORKSPACE_A_ADMIN_EMAIL}`,
    `QA_ADMIN_USER_ID=${userAdmin.id}`,
    `QA_ADMIN_PASSWORD=${pwAdmin}`,
    `QA_MEMBER_EMAIL=${WORKSPACE_A_MEMBER_EMAIL}`,
    `QA_MEMBER_USER_ID=${userMember.id}`,
    `QA_MEMBER_PASSWORD=${pwMember}`,
    "",
  ].join("\n");
  await fs.writeFile(SECRETS_FILE, secrets, { mode: 0o600 });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspaceA.id,
      userId: ownerA.id,
      action: "qa.provision_accounts",
      targetType: "Workspace",
      targetId: workspaceB.id,
      meta: {
        workspaceAId: workspaceA.id,
        workspaceBId: workspaceB.id,
        adminEmail: WORKSPACE_A_ADMIN_EMAIL,
        memberEmail: WORKSPACE_A_MEMBER_EMAIL,
        ownerBEmail: WORKSPACE_B_OWNER_EMAIL,
        userBCreated: userB.created,
        userAdminCreated: userAdmin.created,
        userMemberCreated: userMember.created,
        method: "scripts/qa-provision-accounts.ts",
      },
    },
  });

  // Self-disable after successful run (re-enable by removing marker).
  await fs.writeFile(
    DISABLE_MARKER,
    `Disabled after successful provision at ${new Date().toISOString()}\nRemove this file to re-run.\n`,
    { mode: 0o600 },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        workspaceAId: workspaceA.id,
        workspaceBId: workspaceB.id,
        ownerB: WORKSPACE_B_OWNER_EMAIL,
        admin: WORKSPACE_A_ADMIN_EMAIL,
        member: WORKSPACE_A_MEMBER_EMAIL,
        secretsFile: SECRETS_FILE,
        disabledMarker: DISABLE_MARKER,
        note: "Passwords written only to secrets file (not printed).",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
