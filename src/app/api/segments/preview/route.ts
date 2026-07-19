import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { segmentRulesSchema } from "@/lib/validators/audience";
import { countSegmentContacts } from "@/lib/segments";

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = segmentRulesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const count = await countSegmentContacts(ctx.workspace.id, parsed.data);
  return NextResponse.json({ count });
}
