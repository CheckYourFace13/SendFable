import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import {
  JsonLd,
  marketingPageMeta,
  softwareApplicationJsonLd,
} from "@/components/marketing/json-ld";
import { PLATFORM_TEMPLATES, type PlatformTemplateSeed } from "@/lib/platform-templates";
import { UseTemplateCta } from "@/components/marketing/use-template-cta";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return PLATFORM_TEMPLATES.map((t) => ({ id: t.shareSlug }));
}

const TEMPLATE_META: Record<string, string> = {
  "platform-restaurant-special":
    "Restaurant special email template with a weekly dish headline, a short note to regulars, and a reserve button. Edit the logo, copy, and colors before you send.",
  "platform-brewery-tasting":
    "Brewery tasting-night email template for a limited flight, a Friday date, and a ticket button. Swap in your tap list, logo, and colors in Simple Mode.",
  "platform-retail-sale":
    "Retail weekend-sale email template with a markdown headline, a short stock note, and a shop button. Add your products, logo, and brand colors before sending.",
  "platform-realtor-listing":
    "Realtor new-listing email template with a just-listed headline, a neighborhood note, and a listing button. Add photos, address details, and your branding.",
  "platform-salon-welcome":
    "Salon welcome email template that thanks a new client and offers a book-now button. Add your services, first-visit note, logo, and colors.",
  "platform-cafe-weekly":
    "Cafe weekly-specials email template for new drinks and morning pastries, with a menu button. Drop in this week’s items, logo, and brand colors.",
  "platform-event-invite":
    "Event invitation email template with a save-the-date headline, a short details note, and an RSVP button. Add the date, place, and your branding.",
  "platform-newsletter":
    "Monthly newsletter email template for a short update your subscribers can read in a minute. Add this month’s stories, logo, and brand colors.",
  "platform-holiday-hours":
    "Holiday hours email template that tells customers when you’re open and links to the schedule. Add your dates, location, logo, and colors.",
  "platform-win-back":
    "Win-back email template for customers who have been away, with a thank-you offer and a return button. Add your offer, logo, and brand colors.",
  "platform-review-request":
    "Review-request email template that asks for a short visit review and links to your review page. Add your ask, logo, and brand colors.",
  "platform-grand-opening":
    "Grand-opening email template announcing that the doors are open, with opening-day details and a see-details button. Add your hours, logo, and colors.",
};

type TemplateGuidance = {
  purpose: string;
  whoFor: string;
  whenToSend: string;
  audience: string;
  ctaGuidance: string;
  customizeTips: string[];
};

const TEMPLATE_GUIDANCE: Record<string, TemplateGuidance> = {
  "platform-restaurant-special": {
    purpose: "Tell regulars about a limited dish or chef special without writing a campaign from scratch.",
    whoFor: "Restaurants, cafes with evening service, and chef-driven kitchens.",
    whenToSend: "When the special is live or a day before — usually midweek or morning of service.",
    audience: "Diners who opted in for specials, not your full vendor or hiring list.",
    ctaGuidance: "Send people to reserve, order, or see tonight’s menu. Keep one clear action.",
    customizeTips: [
      "Replace the sample dish with your real special and hours.",
      "Add your logo and brand color in Simple Mode.",
      "Keep the body to a few short sentences.",
    ],
  },
  "platform-brewery-tasting": {
    purpose: "Promote a tasting night or limited pours with a ticket or RSVP path.",
    whoFor: "Breweries, taprooms, and cideries running events.",
    whenToSend: "About a week out, then a short reminder 1–2 days before if seats remain.",
    audience: "Taproom guests and release subscribers — not wholesale accounts.",
    ctaGuidance: "Point to tickets, reservation, or the event page. One primary button.",
    customizeTips: [
      "Name the pours or theme; keep the list short.",
      "Put date, time, and cover in the first screen of the email.",
      "Swap the sample CTA for your real ticket link.",
    ],
  },
  "platform-retail-sale": {
    purpose: "Announce a short sale window with urgency and a shop link.",
    whoFor: "Independent retail, boutiques, and product shops.",
    whenToSend: "When the sale starts, or the morning of the first day.",
    audience: "Customers and VIPs who asked for product news.",
    ctaGuidance: "Send to the sale collection or homepage sale banner — not a generic About page.",
    customizeTips: [
      "State the end day clearly in subject or preview text.",
      "Mention stock limits only if true.",
      "Use your real product photo when you have one.",
    ],
  },
  "platform-realtor-listing": {
    purpose: "Share a new listing with a short neighborhood note and listing link.",
    whoFor: "Agents and small teams who email buyer or sphere lists.",
    whenToSend: "As soon as the listing is live; optional open-house reminder later.",
    audience: "Buyer leads and past clients who opted in for new homes.",
    ctaGuidance: "Link to the listing page or open-house details — one destination.",
    customizeTips: [
      "Replace sample copy with address area and key facts.",
      "Add a real listing photo in Simple Mode.",
      "Keep legal disclaimers in your footer if required.",
    ],
  },
  "platform-salon-welcome": {
    purpose: "Welcome a new client and make the next booking easy.",
    whoFor: "Salons, barbers, and spas with a signup or booking list.",
    whenToSend: "Right after signup or after the first visit thank-you.",
    audience: "New clients only — segment away from long-time regulars if you can.",
    ctaGuidance: "Send to your booking page or preferred booking tool.",
    customizeTips: [
      "Mention first-visit tips that are actually true for your shop.",
      "Add services people commonly book.",
      "Keep the ask to one booking action.",
    ],
  },
  "platform-cafe-weekly": {
    purpose: "Share this week’s drinks and bites in a quick, scannable note.",
    whoFor: "Cafes, coffee shops, and bakeries with a regular list.",
    whenToSend: "Sunday evening or Monday morning before the week’s specials change.",
    audience: "Locals who joined for weekly specials.",
    ctaGuidance: "Link to the menu, online order, or today’s board photo page.",
    customizeTips: [
      "Swap sample items for this week’s real drinks and pastries.",
      "One photo of the board or pastry case is enough.",
      "Keep it shorter than a full newsletter.",
    ],
  },
  "platform-event-invite": {
    purpose: "Invite people to a dated event with a clear RSVP.",
    whoFor: "Local events, venues, nonprofits, and community hosts.",
    whenToSend: "Save-the-date early, then a reminder with logistics closer to the date.",
    audience: "Attendees and partners who opted into event updates.",
    ctaGuidance: "RSVP, tickets, or calendar link — pick one primary action.",
    customizeTips: [
      "Put date, time, and place near the top.",
      "Say what to bring or wear only if it matters.",
      "Use a real event name instead of the sample headline.",
    ],
  },
  "platform-newsletter": {
    purpose: "Send a short monthly update people can finish in a minute.",
    whoFor: "Any small business that posts a few updates each month.",
    whenToSend: "A consistent day each month so the list learns the cadence.",
    audience: "Your general subscriber list.",
    ctaGuidance: "One “read more” or primary story link; avoid a button forest.",
    customizeTips: [
      "Limit to 2–3 short items.",
      "Lead with the most useful update.",
      "Replace sample stories with your real month.",
    ],
  },
  "platform-holiday-hours": {
    purpose: "Tell customers when you’re open or closed for a holiday stretch.",
    whoFor: "Any storefront or service business with changing holiday hours.",
    whenToSend: "A few days before the holiday change, not the morning of.",
    audience: "Local customers who visit or call.",
    ctaGuidance: "Link to hours, map, or contact — whatever answers “can I come by?”",
    customizeTips: [
      "List dates and hours in plain text.",
      "Call out closed days explicitly.",
      "Remove sample filler once your real schedule is in.",
    ],
  },
  "platform-win-back": {
    purpose: "Invite quiet contacts back with a thank-you offer.",
    whoFor: "Retail, restaurants, salons, and services with lapsed customers.",
    whenToSend: "After a quiet period you define — not to brand-new signups.",
    audience: "Contacts with no recent visit or purchase who still opted in.",
    ctaGuidance: "Send to the offer page or booking link that redeems the thank-you.",
    customizeTips: [
      "Only promise an offer you will honor.",
      "Keep the tone warm, not guilt-heavy.",
      "Exclude recent purchasers if you can.",
    ],
  },
  "platform-review-request": {
    purpose: "Ask for a short review after a good visit.",
    whoFor: "Local service and storefront businesses collecting public reviews.",
    whenToSend: "Soon after a completed visit or order, while the experience is fresh.",
    audience: "Recent customers — not your whole list every week.",
    ctaGuidance: "Link to your Google, Yelp, or preferred review page.",
    customizeTips: [
      "Ask for one review destination only.",
      "Keep the ask under a minute.",
      "Thank them whether or not they leave a review.",
    ],
  },
  "platform-grand-opening": {
    purpose: "Announce that you’re open and invite people to the first days.",
    whoFor: "New storefronts and service businesses launching publicly.",
    whenToSend: "A few days before opening, then opening-day morning if needed.",
    audience: "Locals and early interest signups.",
    ctaGuidance: "Link to hours, map, or opening-day details page.",
    customizeTips: [
      "Include address and opening hours.",
      "Mention opening specials only if real.",
      "Swap the sample headline for your business name.",
    ],
  },
};

function sampleBodyHtml(tpl: PlatformTemplateSeed): string {
  const text = tpl.designJson.blocks.find((b) => b.type === "text");
  const html = (text?.props as { html?: string } | undefined)?.html;
  return html || "<p>Customize this example in Simple Mode.</p>";
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const tpl = PLATFORM_TEMPLATES.find((t) => t.shareSlug === id);
  if (!tpl) return {};
  return marketingPageMeta({
    title: `${tpl.name} email template`,
    description:
      TEMPLATE_META[tpl.shareSlug] ||
      `${tpl.name} email template for ${tpl.industry}. Edit the copy, logo, and colors in Simple Mode before you send.`,
    path: `/templates/${tpl.shareSlug}`,
  });
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const tpl = PLATFORM_TEMPLATES.find((t) => t.shareSlug === id);
  if (!tpl) notFound();

  const guidance = TEMPLATE_GUIDANCE[tpl.shareSlug];
  const headline =
    (tpl.designJson.blocks.find((b) => b.type === "heading")?.props as { text?: string } | undefined)
      ?.text || tpl.name;
  const bodyHtml = sampleBodyHtml(tpl);
  const subjects = tpl.suggestedSubjects.slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={softwareApplicationJsonLd()} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Templates", href: "/templates" },
          { label: tpl.name, href: `/templates/${tpl.shareSlug}`, current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-teal">{tpl.industry}</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">{tpl.name}</h1>
      {guidance ? (
        <>
          <p className="mt-3 text-lg text-muted-foreground">{guidance.purpose}</p>
          <p className="mt-2 text-sm text-ink/70">{guidance.whoFor}</p>
        </>
      ) : (
        <p className="mt-3 text-lg text-muted-foreground">{tpl.suggestedPreviewText}</p>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-ink/10 bg-surface">
        <div className="space-y-3 border-b border-ink/10 bg-parchment/60 px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-ink/60">Subject line options</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 font-medium text-ink">
              {subjects.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-ink/60">Preview text example</p>
            <p className="font-medium text-ink">{tpl.suggestedPreviewText}</p>
          </div>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <div className="h-2 w-16 rounded bg-coral" />
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Sample email (reusable example)
          </p>
          <h2 className="font-display text-2xl text-ink">{headline}</h2>
          <div
            className="space-y-3 text-sm leading-relaxed text-charcoal/80 [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
          <div className="inline-block rounded-md bg-coral-solid px-4 py-2 text-sm font-semibold text-white">
            {tpl.recommendedCta}
          </div>
          <p className="text-xs text-ink/55">
            Merge tags like <code className="rounded bg-parchment px-1">{"{{first_name}}"}</code> work
            in Simple Mode. An unsubscribe footer is required and added when you send.
          </p>
        </div>
      </div>

      {guidance ? (
        <section className="mt-8 grid gap-4 text-sm text-ink/80 sm:grid-cols-2">
          <div>
            <h2 className="font-semibold text-ink">When to send</h2>
            <p className="mt-1">{guidance.whenToSend}</p>
          </div>
          <div>
            <h2 className="font-semibold text-ink">Recommended audience</h2>
            <p className="mt-1">{guidance.audience}</p>
          </div>
          <div>
            <h2 className="font-semibold text-ink">CTA guidance</h2>
            <p className="mt-1">{guidance.ctaGuidance}</p>
          </div>
          <div>
            <h2 className="font-semibold text-ink">Customization tips</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {guidance.customizeTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <UseTemplateCta slug={tpl.shareSlug} goal={tpl.goal} />
        <Button asChild variant="outline">
          <Link href="/templates">All templates</Link>
        </Button>
      </div>
    </div>
  );
}
