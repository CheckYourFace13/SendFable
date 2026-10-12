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

const PHRASES: Array<{ re: RegExp; label: string }> = [
  { re: /\bact now\b/i, label: "act now" },
  { re: /\blimited time\b/i, label: "limited time" },
  { re: /\bclick here\b/i, label: "click here" },
  { re: /\bbuy now\b/i, label: "buy now" },
  { re: /\border now\b/i, label: "order now" },
  { re: /\b100%\s*free\b/i, label: "100% free" },
  { re: /\brisk-?free\b/i, label: "risk-free" },
  { re: /\bwinner\b/i, label: "winner" },
  { re: /\bcongratulations\b/i, label: "congratulations" },
  { re: /\bguaranteed\b/i, label: "guaranteed" },
  { re: /\burgent\b/i, label: "urgent" },
  { re: /\bmake money\b/i, label: "make money" },
  { re: /\bno obligation\b/i, label: "no obligation" },
  { re: /\bonce in a lifetime\b/i, label: "once in a lifetime" },
  { re: /\$\$\$/, label: "$$$" },
  { re: /\bthis is not spam\b/i, label: "this is not spam" },
  { re: /\bdear friend\b/i, label: "dear friend" },
];

export function checkSpamCopy(subjectRaw: string, bodyRaw: string): SpamCheck {
  const subject = subjectRaw.replace(/\s+/g, " ").trim();
  const body = bodyRaw.replace(/\s+/g, " ").trim();
  const combined = [subject, body].filter(Boolean).join("\n");

  const phrases: SpamFinding[] = [];
  if (combined) {
    for (const item of PHRASES) {
      if (item.re.test(combined)) {
        phrases.push({
          label: item.label,
          detail: "Common pressure or bait language. Inboxes weigh it with reputation and engagement. One phrase does not automatically filter the mail.",
        });
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
    "Authenticate the domain (SPF, DKIM, DMARC) and send only to people who asked.",
    "Say the offer in plain language. Reputation, list quality, and whether people open and stay matter more than any single word.",
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
