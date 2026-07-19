/**
 * Compile a designJson block tree into bulletproof table-based email HTML.
 * No external paid services — pure string compilation.
 */

export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "social"
  | "footer";

export interface DesignBlock {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  children?: DesignBlock[];
}

export interface EmailDesign {
  version: 1;
  blocks: DesignBlock[];
  settings?: {
    backgroundColor?: string;
    contentWidth?: number;
    fontFamily?: string;
  };
}

export interface CompileOptions {
  mailingAddress?: string | null;
  unsubscribeUrl?: string;
  showSendfableBadge?: boolean;
  previewText?: string | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attr(s: string): string {
  return esc(s).replace(/'/g, "&#39;");
}

function blockHeading(props: Record<string, unknown>): string {
  const text = String(props.text ?? "Heading");
  const level = Number(props.level ?? 1);
  const align = String(props.align ?? "left");
  const color = String(props.color ?? "#111827");
  const size = level === 1 ? 28 : level === 2 ? 22 : 18;
  return `<tr><td style="padding:8px 32px;text-align:${attr(align)};">
    <h${Math.min(3, Math.max(1, level))} style="margin:0;font-size:${size}px;font-weight:700;line-height:1.3;color:${attr(color)};">${text}</h${Math.min(3, Math.max(1, level))}>
  </td></tr>`;
}

function blockText(props: Record<string, unknown>): string {
  const html = String(props.html ?? props.text ?? "");
  const align = String(props.align ?? "left");
  return `<tr><td style="padding:8px 32px;text-align:${attr(align)};font-size:15px;line-height:1.6;color:#374151;">
    ${html}
  </td></tr>`;
}

function blockImage(props: Record<string, unknown>): string {
  const src = String(props.src ?? "");
  const alt = String(props.alt ?? "");
  const href = props.href ? String(props.href) : null;
  const width = Number(props.width ?? 520);
  if (!src) return "";
  const img = `<img src="${attr(src)}" alt="${attr(alt)}" width="${width}" style="display:block;max-width:100%;height:auto;border:0;margin:0 auto;" />`;
  const inner = href ? `<a href="${attr(href)}" style="text-decoration:none;">${img}</a>` : img;
  return `<tr><td style="padding:8px 32px;" align="center">${inner}</td></tr>`;
}

function blockButton(props: Record<string, unknown>): string {
  const label = String(props.label ?? "Click here");
  const href = String(props.href ?? "#");
  const bg = String(props.backgroundColor ?? "#4F46E5");
  const color = String(props.textColor ?? "#ffffff");
  const align = String(props.align ?? "center");
  return `<tr><td style="padding:16px 32px;" align="${attr(align)}">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td style="border-radius:8px;background-color:${attr(bg)};">
        <a href="${attr(href)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${attr(color)};text-decoration:none;border-radius:8px;">${esc(label)}</a>
      </td>
    </tr></table>
  </td></tr>`;
}

function blockDivider(props: Record<string, unknown>): string {
  const color = String(props.color ?? "#e5e7eb");
  return `<tr><td style="padding:16px 32px;"><hr style="border:none;border-top:1px solid ${attr(color)};margin:0;" /></td></tr>`;
}

function blockSpacer(props: Record<string, unknown>): string {
  const height = Number(props.height ?? 24);
  return `<tr><td style="height:${height}px;line-height:${height}px;font-size:1px;">&nbsp;</td></tr>`;
}

function blockSocial(props: Record<string, unknown>): string {
  const links = (props.links as Array<{ network: string; url: string }>) ?? [];
  if (!links.length) return "";
  const cells = links
    .map(
      (l) =>
        `<a href="${attr(l.url)}" style="display:inline-block;margin:0 8px;font-size:13px;color:#4F46E5;text-decoration:none;">${esc(l.network)}</a>`
    )
    .join("");
  return `<tr><td style="padding:12px 32px;text-align:center;">${cells}</td></tr>`;
}

function blockColumns(block: DesignBlock, opts: CompileOptions): string {
  const cols = block.children ?? [];
  if (!cols.length) return "";
  const width = Math.floor(100 / cols.length);
  const cells = cols
    .map((col) => {
      const inner = (col.children ?? []).map((b) => compileBlock(b, opts)).join("");
      return `<td width="${width}%" valign="top" style="padding:0 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${inner || "<tr><td>&nbsp;</td></tr>"}</table>
      </td>`;
    })
    .join("");
  return `<tr><td style="padding:8px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr>`;
}

function blockFooter(props: Record<string, unknown>, opts: CompileOptions): string {
  const address = String(props.mailingAddress ?? opts.mailingAddress ?? "");
  const unsub = opts.unsubscribeUrl ?? "{{unsubscribe_url}}";
  const badge = opts.showSendfableBadge
    ? `<div style="margin-top:12px;"><a href="https://sendfable.com" style="font-size:11px;color:#9ca3af;text-decoration:none;">Sent with <strong style="color:#4F46E5;">Sendfable</strong></a></div>`
    : "";
  return `<tr><td style="padding:24px 32px;text-align:center;font-size:12px;line-height:1.5;color:#9ca3af;border-top:1px solid #e5e7eb;">
    ${address ? `<div style="margin-bottom:8px;">${esc(address)}</div>` : ""}
    <div><a href="${attr(unsub)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a></div>
    ${badge}
  </td></tr>`;
}

function compileBlock(block: DesignBlock, opts: CompileOptions): string {
  switch (block.type) {
    case "heading":
      return blockHeading(block.props);
    case "text":
      return blockText(block.props);
    case "image":
      return blockImage(block.props);
    case "button":
      return blockButton(block.props);
    case "divider":
      return blockDivider(block.props);
    case "spacer":
      return blockSpacer(block.props);
    case "social":
      return blockSocial(block.props);
    case "columns":
      return blockColumns(block, opts);
    case "footer":
      return blockFooter(block.props, opts);
    default:
      return "";
  }
}

function hasFooter(blocks: DesignBlock[]): boolean {
  return blocks.some((b) => b.type === "footer");
}

export function createEmptyDesign(): EmailDesign {
  return {
    version: 1,
    blocks: [
      {
        id: "h1",
        type: "heading",
        props: { text: "Your headline here", level: 1, align: "left" },
      },
      {
        id: "t1",
        type: "text",
        props: {
          html: "<p>Write something your subscribers will love. Use {{first_name|there}} to personalize.</p>",
          align: "left",
        },
      },
      {
        id: "b1",
        type: "button",
        props: {
          label: "Call to action",
          href: "https://example.com",
          backgroundColor: "#4F46E5",
          textColor: "#ffffff",
          align: "center",
        },
      },
    ],
    settings: {
      backgroundColor: "#f8fafc",
      contentWidth: 600,
      fontFamily: "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    },
  };
}

export function compileEmailHtml(design: EmailDesign, opts: CompileOptions = {}): string {
  const settings = design.settings ?? {};
  const bg = settings.backgroundColor ?? "#f8fafc";
  const width = settings.contentWidth ?? 600;
  const font = settings.fontFamily ?? "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const blocks = [...design.blocks];
  if (!hasFooter(blocks)) {
    blocks.push({
      id: "auto-footer",
      type: "footer",
      props: { mailingAddress: opts.mailingAddress ?? "" },
    });
  }

  const body = blocks.map((b) => compileBlock(b, opts)).join("\n");
  const preview = opts.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(opts.previewText)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title></title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style type="text/css">
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
  body{margin:0;padding:0;width:100% !important;}
  @media only screen and (max-width:620px){
    .email-container{width:100% !important;}
    .fluid{max-width:100% !important;width:100% !important;height:auto !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${attr(bg)};font-family:${attr(font)};">
${preview}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${attr(bg)};">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="${width}" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" class="email-container" width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
${body}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** Inject open pixel + rewrite http(s) links for click tracking. Returns rewritten HTML + extracted link URLs. */
export function injectTracking(
  html: string,
  recipientId: string,
  appBase: string
): { html: string; links: string[] } {
  const links: string[] = [];
  let idx = 0;
  const rewritten = html.replace(
    /href=["'](https?:\/\/[^"']+)["']/gi,
    (_m, url: string) => {
      // Don't rewrite unsubscribe or tracking links
      if (url.includes("/unsubscribe") || url.includes("/api/t/")) {
        return `href="${url}"`;
      }
      const linkIndex = idx++;
      links.push(url);
      // linkId placeholder — caller replaces with real CampaignLink ids after insert
      return `href="${appBase}/api/t/c/${recipientId}/__LINK_${linkIndex}__"`;
    }
  );
  const pixel = `<img src="${appBase}/api/t/o/${recipientId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  const withPixel = rewritten.includes("</body>")
    ? rewritten.replace("</body>", `${pixel}</body>`)
    : rewritten + pixel;
  return { html: withPixel, links };
}

export function applyLinkIds(html: string, linkIds: string[]): string {
  let out = html;
  linkIds.forEach((id, i) => {
    out = out.replaceAll(`__LINK_${i}__`, id);
  });
  return out;
}
