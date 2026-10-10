import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerAdminUser } from "@/lib/platform-admin";
import {
  createInternalWorkspace,
  listInternalWorkspaceSummaries,
  provisionDrinkKnirdProductSurface,
} from "@/lib/admin/internal-workspaces";

export async function GET() {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workspaces = await listInternalWorkspaceSummaries();
  return NextResponse.json({
    role: "OWNER_ADMIN",
    workspaces,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  websiteUrl: z.string().trim().min(1).max(500),
  internalLabel: z.string().trim().min(1).max(80).optional(),
  plan: z.enum(["FREE", "STARTER", "GROWTH", "PRO", "PRO_PLUS"]).optional(),
  mailingAddress: z.string().trim().max(500).optional().nullable(),
  /** When true, also provision DrinkKnird audience/form/autopilot/welcome. */
  provisionDrinkKnird: z.boolean().optional(),
});

export async function POST(req: Request) {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    const result = await createInternalWorkspace({
      adminUserId: admin.id,
      name: parsed.data.name,
      websiteUrl: parsed.data.websiteUrl,
      internalLabel: parsed.data.internalLabel,
      plan: parsed.data.plan,
      mailingAddress: parsed.data.mailingAddress,
      ip,
    });

    let provision = null;
    if (parsed.data.provisionDrinkKnird) {
      provision = await provisionDrinkKnirdProductSurface({
        workspaceId: result.workspace.id,
        adminUserId: admin.id,
        replyToEmail: admin.email,
        ip,
      });
    }

    return NextResponse.json(
      {
        workspace: result.workspace,
        created: result.created,
        provision: provision
          ? {
              tag: provision.tag.name,
              formSlug: provision.form.hostedSlug,
              formId: provision.form.id,
              identity: {
                value: provision.identity.value,
                displayName: provision.identity.displayName,
              },
              autopilotUrl: provision.autopilot.pageUrl,
              welcomeCampaignId: provision.welcome.id,
            }
          : null,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
