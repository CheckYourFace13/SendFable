import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/session";
import { applyTrySignupDraft } from "@/lib/try-signup/apply";
import { trackEvent } from "@/lib/analytics";

const claimSchema = z.object({
  token: z.string().trim().min(8).max(64),
});

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = claimSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const applied = await applyTrySignupDraft({
    workspaceId: ctx.workspace.id,
    token: parsed.data.token,
  });
  if (!applied.ok) {
    const status = applied.reason === "already_claimed" ? 409 : 404;
    return NextResponse.json({ error: applied.reason || "Not found" }, { status });
  }

  if (applied.formId) trackEvent("real_signup_tool_created", { formId: applied.formId });

  return NextResponse.json({
    ok: true,
    formId: applied.formId,
    hostedSlug: applied.hostedSlug,
    platform: applied.platform,
    display: applied.display,
  });
}
