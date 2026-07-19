/**
 * Lightweight HTML sanitizer for raw email HTML (MVP — no DOM deps).
 * Strips script/iframe/object/embed, on* handlers, and javascript: URLs.
 */

const DANGEROUS_TAGS =
  /<\/?(?:script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math|frame|frameset|applet)(?:\s[^>]*)?>/gi;

const EVENT_HANDLER_ATTR =
  /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const JS_URL_IN_ATTR =
  /(\s(?:href|src|action|formaction|xlink:href)\s*=\s*)(["']?)\s*javascript\s*:/gi;

const DATA_HTML_URL =
  /(\s(?:href|src|action)\s*=\s*)(["']?)\s*data\s*:\s*text\/html/gi;

const VBScript_URL =
  /(\s(?:href|src|action)\s*=\s*)(["']?)\s*vbscript\s*:/gi;

/** Sanitize raw HTML used in campaigns. Safe for empty/nullish input. */
export function sanitizeEmailHtml(input: string | null | undefined): string {
  if (input == null) return "";
  let html = String(input);

  // Remove script blocks including content
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  // Remove iframe / object / embed / form blocks with content
  html = html.replace(/<(iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "");

  html = html.replace(DANGEROUS_TAGS, "");
  html = html.replace(EVENT_HANDLER_ATTR, "");
  html = html.replace(JS_URL_IN_ATTR, "$1$2#blocked-");
  html = html.replace(DATA_HTML_URL, "$1$2#blocked-");
  html = html.replace(VBScript_URL, "$1$2#blocked-");

  // Neutralize javascript: that appears after entity encoding tricks in href
  html = html.replace(
    /(href\s*=\s*["'])\s*(?:&#106;|&#x6a;|\\u006a|j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t)\s*:/gi,
    "$1#blocked-"
  );

  return html;
}
