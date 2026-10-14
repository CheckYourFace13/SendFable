import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { validateInquiryEmail } from "@/lib/inquiry/email";
import { inquiryEmailProblem } from "@/lib/inquiry/email-syntax";
import { classifyInquirySpam, inquiryDuplicateKey, inquiryTokenError } from "@/lib/inquiry/guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().max(254),
  company: z.string().trim().max(160).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  partnerType: z.string().trim().min(2).max(64),
  audienceNote: z.string().trim().max(2000).optional().nullable(),
  website_url: z.string().optional().nullable(), // honeypot
  formToken: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  if (parsed.data.website_url) {
    return NextResponse.json({ ok: true });
  }

  if (inquiryEmailProblem(parsed.data.email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const tokenError = inquiryTokenError("partners", parsed.data.formToken);
  if (tokenError) {
    return NextResponse.json({ error: tokenError }, { status: 400 });
  }

  const ip = clientIp(req);
  const attempts = await rateLimit("partner-attempt", ip, 20, 3600);
  if (!attempts.ok) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const emailCheck = await validateInquiryEmail(parsed.data.email);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }

  const rl = await rateLimit("partner-apply", ip, 5, 3600);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const note = parsed.data.audienceNote || "";
  const dup = await rateLimit("partner-dup", inquiryDuplicateKey(emailCheck.email, `${parsed.data.partnerType}\n${note}`), 1, 3600);
  if (!dup.ok) {
    return NextResponse.json(
      { error: "We already received this application. Change the note if you need to add something." },
      { status: 429 },
    );
  }

  const spam = classifyInquirySpam(`${parsed.data.company || ""} ${note}`) === "SPAM";

  await prisma.partnerApplication.create({
    data: {
      name: parsed.data.name,
      email: emailCheck.email,
      company: parsed.data.company || null,
      website: parsed.data.website || null,
      partnerType: parsed.data.partnerType,
      audienceNote: parsed.data.audienceNote || null,
      status: spam ? "SPAM" : "NEW",
    },
  });

  return NextResponse.json({ ok: true });
}
