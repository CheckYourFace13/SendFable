import type { EmailDesign } from "@/lib/email-compiler";
import { randomToken } from "@/lib/utils";

/** Default Simple Mode blocks — same designJson format as Advanced. */
export function createSimpleDesign(opts?: {
  headline?: string;
  messageHtml?: string;
  buttonLabel?: string;
  buttonHref?: string;
  logoUrl?: string | null;
  logoAlt?: string;
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  /** When set, skip the empty placeholder unless imageUrl is a real image. */
  omitPlaceholderImage?: boolean;
  imageUrl?: string | null;
  imageAlt?: string;
  buttonRadius?: "rounded" | "square";
}): EmailDesign {
  const color = opts?.primaryColor || "#4F46E5";
  const blocks: EmailDesign["blocks"] = [];

  if (opts?.logoUrl) {
    blocks.push({
      id: randomToken(8),
      type: "image",
      props: { src: opts.logoUrl, alt: opts.logoAlt || "Logo", width: 160 },
    });
  }

  const content: EmailDesign["blocks"] = [
    {
      id: randomToken(8),
      type: "heading",
      props: {
        text: opts?.headline || "Your headline",
        level: 1,
        align: "left",
        color: opts?.accentColor || "#111827",
      },
    },
  ];

  if (opts?.omitPlaceholderImage) {
    if (opts.imageUrl) {
      content.push({
        id: randomToken(8),
        type: "image",
        props: { src: opts.imageUrl, alt: opts.imageAlt || "", width: 520 },
      });
    }
  } else {
    content.push({
      id: randomToken(8),
      type: "image",
      props: { src: "", alt: "Featured image", width: 520 },
    });
  }

  const button: Record<string, unknown> = {
    label: opts?.buttonLabel || "Learn more",
    href: opts?.buttonHref || "https://",
    backgroundColor: color,
    textColor: "#ffffff",
    align: "center",
  };
  if (opts?.buttonRadius) button.borderRadius = opts.buttonRadius === "square" ? 0 : 8;

  const text: Record<string, unknown> = {
    html:
      opts?.messageHtml ||
      "<p>Hi {{first_name|there}},</p><p>Write a short message your customers will actually want to read.</p>",
    align: "left",
  };
  if (opts?.textColor) text.color = opts.textColor;

  content.push(
    {
      id: randomToken(8),
      type: "text",
      props: text,
    },
    {
      id: randomToken(8),
      type: "button",
      props: button,
    },
    {
      id: randomToken(8),
      type: "footer",
      props: { mailingAddress: "" },
    }
  );

  blocks.push(...content);

  return {
    version: 1,
    blocks,
    settings: {
      backgroundColor: opts?.backgroundColor || "#f8fafc",
      contentWidth: 600,
      fontFamily:
        opts?.fontFamily ||
        "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
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
