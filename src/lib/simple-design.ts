import type { EmailDesign } from "@/lib/email-compiler";
import { randomToken } from "@/lib/utils";

/** Default Simple Mode blocks — same designJson format as Advanced. */
export function createSimpleDesign(opts?: {
  headline?: string;
  messageHtml?: string;
  buttonLabel?: string;
  buttonHref?: string;
  logoUrl?: string | null;
  primaryColor?: string;
}): EmailDesign {
  const color = opts?.primaryColor || "#4F46E5";
  const blocks: EmailDesign["blocks"] = [];

  if (opts?.logoUrl) {
    blocks.push({
      id: randomToken(8),
      type: "image",
      props: { src: opts.logoUrl, alt: "Logo", width: 160 },
    });
  }

  blocks.push(
    {
      id: randomToken(8),
      type: "heading",
      props: {
        text: opts?.headline || "Your headline",
        level: 1,
        align: "left",
        color: "#111827",
      },
    },
    {
      id: randomToken(8),
      type: "image",
      props: { src: "", alt: "Featured image", width: 520 },
    },
    {
      id: randomToken(8),
      type: "text",
      props: {
        html:
          opts?.messageHtml ||
          "<p>Hi {{first_name|there}},</p><p>Write a short message your customers will actually want to read.</p>",
        align: "left",
      },
    },
    {
      id: randomToken(8),
      type: "button",
      props: {
        label: opts?.buttonLabel || "Learn more",
        href: opts?.buttonHref || "https://",
        backgroundColor: color,
        textColor: "#ffffff",
        align: "center",
      },
    },
    {
      id: randomToken(8),
      type: "footer",
      props: { mailingAddress: "" },
    }
  );

  return {
    version: 1,
    blocks,
    settings: {
      backgroundColor: "#f8fafc",
      contentWidth: 600,
      fontFamily: "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    },
  };
}

export const SIMPLE_BLOCK_TYPES = new Set([
  "heading",
  "text",
  "image",
  "button",
  "footer",
]);
