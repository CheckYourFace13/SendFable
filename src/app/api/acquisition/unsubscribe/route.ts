import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";
import { suppressProspect } from "@/lib/acquisition/suppression";
import { normalizeEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function processUnsub(token: string | null): Promise<NextResponse> {
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const payload = await verifyToken("acquisition-unsub", token);
  if (!payload?.prospectId || !payload?.email) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const prospect = await prisma.acquisitionProspect.findUnique({
    where: { id: payload.prospectId },
  });
  if (!prospect) {
    return NextResponse.json({ ok: true, already: true });
  }

  if (
    prospect.contactEmail &&
    normalizeEmail(prospect.contactEmail) !== normalizeEmail(payload.email)
  ) {
    return NextResponse.json({ error: "Token mismatch" }, { status: 403 });
  }

  await suppressProspect(prospect.id, "UNSUBSCRIBED", "one_click_unsub");
  return NextResponse.json({ ok: true, unsubscribed: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const res = await processUnsub(token);
  if (res.status === 200) {
    // Friendly HTML confirmation
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;">
      <h1>You're unsubscribed</h1>
      <p>You won't receive further SendFable acquisition outreach.</p>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
  return res;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get("token");
  if (!token) {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      token = String(form.get("token") || "");
    } else {
      const json = await req.json().catch(() => null);
      token = json?.token || null;
    }
  }
  return processUnsub(token);
}
