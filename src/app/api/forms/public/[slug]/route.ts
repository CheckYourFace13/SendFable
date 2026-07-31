import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSmsConsentDisclosure, SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent";
import { appUrl } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: params.slug },
    select: {
      name: true,
      fields: true,
      doubleOptIn: true,
      hostedSlug: true,
      collectPhone: true,
      workspace: { select: { name: true, websiteUrl: true } },
    },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = Array.isArray(form.fields) ? [...(form.fields as object[])] : [];
  const hasPhone = form.collectPhone || fields.some((f: any) => f?.type === "phone" || f?.key === "phone");
  const brandName = form.workspace.name;
  const privacyPolicyUrl = `${appUrl("/privacy")}`;
  const smsTermsUrl = `${appUrl("/terms")}`;

  return NextResponse.json({
    form: {
      name: form.name,
      fields,
      doubleOptIn: form.doubleOptIn,
      hostedSlug: form.hostedSlug,
      collectPhone: hasPhone,
      brandName,
      privacyPolicyUrl,
      smsTermsUrl,
      smsConsentDisclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
      smsConsentDisclosure: buildSmsConsentDisclosure({
        brandName,
        privacyPolicyUrl,
        smsTermsUrl,
      }),
    },
  });
}
