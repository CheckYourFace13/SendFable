import Link from "next/link";
import { PLATFORM_TEMPLATES } from "@/lib/platform-templates";

/** Finished-looking email previews from real platform templates (no empty color blocks). */
const PREVIEW = PLATFORM_TEMPLATES.slice(0, 8).map((t) => {
  const heading = t.designJson.blocks.find((b) => b.type === "heading");
  const text = t.designJson.blocks.find((b) => b.type === "text");
  const button = t.designJson.blocks.find((b) => b.type === "button");
  const headline =
    heading && "text" in heading.props ? String(heading.props.text) : t.name;
  const bodyHtml =
    text && "html" in text.props ? String(text.props.html) : "";
  const body = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  const cta =
    button && "label" in button.props
      ? String(button.props.label)
      : t.recommendedCta;
  const color =
    (button && "backgroundColor" in button.props
      ? String(button.props.backgroundColor)
      : null) || "#E4572E";
  return {
    id: t.shareSlug,
    name: t.name,
    subject: t.suggestedSubjects[0] || t.name,
    headline,
    body: body || t.suggestedPreviewText,
    cta,
    color,
    href: `/templates/${t.shareSlug}`,
  };
});

export function TemplateGallery() {
  return (
    <section className="border-b border-ink/10 bg-lavender/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-display-md text-ink text-balance">
            Templates that look like finished emails
          </h2>
          <p className="mt-3 text-charcoal/75">
            Real SendFable layouts for common small-business sends. Start from any of them after
            signup.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <ul
          className="flex gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
          aria-label="Email template previews"
        >
          {PREVIEW.map((t) => (
            <li key={t.id} className="w-[220px] shrink-0 sm:w-[240px]">
              <Link
                href={t.href}
                className="block overflow-hidden rounded-xl border-2 border-ink/10 bg-page shadow-md page-lift transition hover:border-ink/25"
              >
                <article>
                  <div className="border-b border-ink/8 px-3 py-2">
                    <p className="truncate text-[11px] text-ink/70">{t.subject}</p>
                  </div>
                  <div className="space-y-2.5 p-3">
                    <div
                      className="rounded-md px-3 py-4 text-white"
                      style={{ backgroundColor: t.color }}
                      aria-hidden="true"
                    >
                      <p className="font-display text-sm leading-snug">{t.headline}</p>
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-ink/75">{t.body}</p>
                    <div
                      className="inline-block rounded px-2.5 py-1 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.cta}
                    </div>
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
