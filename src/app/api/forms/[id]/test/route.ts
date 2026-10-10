import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { acceptFormSubmission } from "@/lib/forms/accept";
import { formClientIp } from "@/lib/forms/policy";

const schema = z.object({
  fields: z.record(z.union([z.string(), z.boolean()])),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const form = await prisma.signupForm.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id, status: { not: "ARCHIVED" } },
    include: { workspace: true },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await acceptFormSubmission({
    form,
    values: parsed.data.fields,
    attribution: { pageUrl: "https://sendfable.com/forms/" + form.id, utmSource: "sendfable", utmMedium: "test" },
    ip: formClientIp(req.headers),
    userAgent: req.headers.get("user-agent"),
    test: true,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({
    ok: true,
    stored: result.stored,
    pendingConfirm: result.pendingConfirm,
    message: result.stored ? "Submission received" : "Submission received",
  });
}
