/**
 * Local checklist for risky email language. A match is not a spam verdict.
 */

export type SpamFinding = {
  label: string;
  detail: string;
};

export type SpamCheck = {
  phrases: SpamFinding[];
  formatting: SpamFinding[];
  suggestions: string[];
};

const PHRASES: Array<{ re: RegExp; label: string; detail: string; replaceWith: string }> = [
  { re: /\bact now\b/i, label: "act now", detail: "Pressure timing. Say what happens next instead.", replaceWith: "today" },
  { re: /\blimited time\b/i, label: "limited time", detail: "Fake scarcity. Name a real end date if you have one.", replaceWith: "this week" },
  { re: /\bclick here\b/i, label: "click here", detail: "Vague link text. Name the destination.", replaceWith: "see details" },
  { re: /\bbuy now\b/i, label: "buy now", detail: "Hard sell. Invite people to the offer page.", replaceWith: "shop the offer" },
  { re: /\border now\b/i, label: "order now", detail: "Hard sell. Invite people to place an order.", replaceWith: "place an order" },
  { re: /\b100%\s*free\b/i, label: "100% free", detail: "Overclaim. “Free” is enough when it is true.", replaceWith: "free" },
  { re: /\brisk-?free\b/i, label: "risk-free", detail: "Guarantee language. Describe the real policy.", replaceWith: "easy to try" },
  { re: /\bwinner\b/i, label: "winner", detail: "Lottery bait. Avoid prize framing unless it is a real contest.", replaceWith: "you’re in" },
  { re: /\bcongratulations\b/i, label: "congratulations", detail: "Often used in scam openers. Lead with the real news.", replaceWith: "good news" },
  { re: /\bguaranteed\b/i, label: "guaranteed", detail: "Absolute claim. Soften to what you can deliver.", replaceWith: "backed by" },
  { re: /\burgent\b/i, label: "urgent", detail: "Artificial urgency. Explain why timing matters.", replaceWith: "time-sensitive" },
  { re: /\bmake money\b/i, label: "make money", detail: "Get-rich framing. Describe the actual offer.", replaceWith: "earn" },
  { re: /\bno obligation\b/i, label: "no obligation", detail: "Sales filler. Skip it if the next step is free to browse.", replaceWith: "no pressure" },
  { re: /\bonce in a lifetime\b/i, label: "once in a lifetime", detail: "Hype. Prefer a concrete offer.", replaceWith: "rare" },
  { re: /\$\$\$/, label: "$$$", detail: "Money symbols look spammy. Use a clear price.", replaceWith: "" },
  { re: /\bthis is not spam\b/i, label: "this is not spam", detail: "Saying it does not help. Remove the line.", replaceWith: "" },
  { re: /\bdear friend\b/i, label: "dear friend", detail: "Impersonal opener. Use a name or skip the greeting.", replaceWith: "hi" },
];

export function checkSpamCopy(subjectRaw: string, bodyRaw: string): SpamCheck {
  const subject = subjectRaw.replace(/\s+/g, " ").trim();
  const body = bodyRaw.replace(/\s+/g, " ").trim();
  const combined = [subject, body].filter(Boolean).join("\n");

  const phrases: SpamFinding[] = [];
  const phraseSuggestions: string[] = [];
  if (combined) {
    for (const item of PHRASES) {
      if (item.re.test(combined)) {
        phrases.push({
          label: item.label,
          detail: item.detail,
        });
        if (item.replaceWith) {
          phraseSuggestions.push(`Try “${item.replaceWith}” instead of “${item.label}”.`);
        } else {
          phraseSuggestions.push(`Remove “${item.label}”.`);
        }
      }
    }
  }

  const formatting: SpamFinding[] = [];
  const caps = capsNote(subject, "Subject") ?? capsNote(body, "Body");
  if (caps) formatting.push(caps);

  const bangs = (combined.match(/!/g) || []).length;
  if (bangs > 2) {
    formatting.push({
      label: `${bangs} exclamation marks`,
      detail: "Repeated punctuation is a formatting smell. It is not, by itself, a spam verdict.",
    });
  }

  const words = combined ? combined.split(/\s+/).filter(Boolean).length : 0;
  const links = combined.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links >= 3 && words > 0 && words / links < 40) {
    formatting.push({
      label: `${links} links in ${words} words`,
      detail: "A short note packed with links is harder to trust. One clear link is usually enough.",
    });
  }

  const suggestions = [
    ...phraseSuggestions.slice(0, 6),
    "Authenticate the domain (SPF, DKIM, DMARC) and send only to people who asked.",
  ];
  if (!combined) {
    suggestions.unshift("Paste a subject, a body, or both. Nothing is saved.");
  } else if (phrases.length === 0 && formatting.length === 0) {
    suggestions.unshift("No checklist hits. That still does not promise the inbox. A quiet list and a wanted email do more than clean wording.");
  }

  return { phrases, formatting, suggestions };
}

function capsNote(text: string, where: string): SpamFinding | null {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12) return null;
  const upper = letters.replace(/[^A-Z]/g, "").length / letters.length;
  if (upper < 0.55) return null;
  return {
    label: `${where} is mostly capitals`,
    detail: "Shouting is harder to read and looks like a blast. Write it as a sentence.",
  };
}
