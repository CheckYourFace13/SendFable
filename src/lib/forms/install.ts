import type { FormFieldDef } from "@/lib/forms/fields";
import { emailConsentText } from "@/lib/forms/fields";

export function embedSnippet(origin: string, slug: string): string {
  const base = origin.replace(/\/$/, "");
  return `<div data-sendfable-form="${slug}"></div>\n<script src="${base}/embed/form.js" async></script>`;
}

export function developerInstructions(input: {
  origin: string;
  businessName: string;
  formName: string;
  slug: string;
  audienceName: string;
  fields: FormFieldDef[];
  smsConsentEnabled: boolean;
  successMessage: string;
}): string {
  const endpoint = `${input.origin.replace(/\/$/, "")}/api/forms/submit`;
  const exampleFields: Record<string, string | boolean> = {};
  for (const field of input.fields) {
    if (field.key === "email") exampleFields.email = "reader@example.com";
    else if (field.key === "phone") exampleFields.phone = "3125551212";
    else if (field.key === "firstName") exampleFields.firstName = "Ada";
    else if (field.key === "lastName") exampleFields.lastName = "Lovelace";
    else if (field.key === "company") exampleFields.company = "Northwind";
    else if (field.key === "zip") exampleFields.zip = "60614";
  }
  if (input.smsConsentEnabled) exampleFields.smsConsent = false;
  const required = input.fields.filter((field) => field.required).map((field) => field.label);
  const optional = input.fields.filter((field) => !field.required).map((field) => field.label);
  return [
    `Install the ${input.formName} form for ${input.businessName}.`,
    `Audience: ${input.audienceName}.`,
    `Submissions stay in this business only. Do not send them to another SendFable workspace.`,
    ``,
    `Preferred: paste this on the website. No server proxy.`,
    embedSnippet(input.origin, input.slug),
    ``,
    `Hosted form: ${input.origin.replace(/\/$/, "")}/f/${input.slug}`,
    ``,
    `Server-side alternative, from the website's own server, not browser JavaScript:`,
    `POST ${endpoint}`,
    `Content-Type: application/json`,
    JSON.stringify(
      {
        slug: input.slug,
        token: "<token from GET /api/forms/public/" + input.slug + ">",
        fields: exampleFields,
        attribution: {
          pageUrl: "https://example.com/newsletter",
          referrer: "https://example.com/",
          utmSource: "site",
          utmMedium: "form",
          utmCampaign: "newsletter",
        },
      },
      null,
      2
    ),
    ``,
    `Required: ${required.join(", ") || "none"}.`,
    `Optional: ${optional.join(", ") || "none"}.`,
    input.smsConsentEnabled
      ? `Phone does not grant text permission. Set fields.smsConsent to true only when the person checks the separate SMS box. Leave it false or omit it otherwise.`
      : `Do not send smsConsent. This form does not ask for text-message permission.`,
    `Leave fields.sf_hp empty. It is a hidden spam field.`,
    `Load the public form first and wait at least 2 seconds before posting. Send the token it returns.`,
    ``,
    `Success: HTTP 200 {"ok":true,"pendingConfirm":false}`,
    `Then show: ${input.successMessage}`,
    `Missing required field: HTTP 400 {"error":"<Label> is required"}`,
    `Invalid email: HTTP 400 {"error":"Valid email required"}`,
    `Too many tries: HTTP 429 {"error":"Too many submissions"}`,
    ``,
    `Email consent text: ${emailConsentText(input.businessName)}`,
    `There is no API secret in the embed. Do not add one.`,
  ].join("\n");
}
