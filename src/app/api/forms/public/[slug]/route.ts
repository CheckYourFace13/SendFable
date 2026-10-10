import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSmsConsentDisclosure, SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent";
import { appUrl } from "@/lib/utils";
import { signToken } from "@/lib/tokens";
import { emailConsentText } from "@/lib/forms/fields";
import { applyPublicFormCors, publicFormPreflight } from "@/lib/forms/cors";

export function OPTIONS(req: Request) {
  return publicFormPreflight(req);
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: params.slug },
    select: {
      name: true,
      fields: true,
      doubleOptIn: true,
      hostedSlug: true,
      collectPhone: true,
      smsConsentEnabled: true,
      buttonLabel: true,
      successMessage: true,
      theme: true,
      emailDisclosureVersion: true,
      status: true,
      workspace: { select: { name: true, primaryColor: true } },
    },
  });
  if (!form || form.status !== "ACTIVE") {
    return applyPublicFormCors(req, NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  const token = await signToken(
    "form-issue",
    { slug: form.hostedSlug, issuedAt: new Date().toISOString() },
    "2h"
  );
  const brandName = form.workspace.name;
  const privacyPolicyUrl = appUrl("/privacy");
  const smsTermsUrl = appUrl("/terms");

  return applyPublicFormCors(
    req,
    NextResponse.json({
      form: {
        name: form.name,
        fields: form.fields,
        doubleOptIn: form.doubleOptIn,
        hostedSlug: form.hostedSlug,
        collectPhone: form.collectPhone,
        smsConsentEnabled: form.smsConsentEnabled,
        buttonLabel: form.buttonLabel,
        successMessage: form.successMessage,
        theme: form.theme,
        primaryColor: form.workspace.primaryColor,
        brandName,
        emailConsentText: emailConsentText(brandName),
        emailDisclosureVersion: form.emailDisclosureVersion,
        privacyPolicyUrl,
        smsTermsUrl,
        smsConsentDisclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
        smsConsentDisclosure: buildSmsConsentDisclosure({ brandName, privacyPolicyUrl, smsTermsUrl }),
      },
      token,
    })
  );
}
