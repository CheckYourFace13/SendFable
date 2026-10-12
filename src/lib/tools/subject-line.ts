/**
 * Checklist score for a subject line. Not a prediction of opens.
 */

export type SubjectRating = "Clear" | "Usable" | "Needs a rewrite";

export type SubjectAssessment = {
  score: number;
  rating: SubjectRating;
  notes: string[];
  examples: string[];
};

const VAGUE =
  /^(re:|fw:|fwd:)?\s*(newsletter|update|updates|hello|hi|hey|checking in|quick question|important|reminder|announcement|news|monthly update)\s*[!.]*$/i;

const PRESSURE =
  /\b(act now|limited time|click here|buy now|order now|100% free|risk-?free|winner|congratulations|urgent|guaranteed|don't miss|dont miss)\b/i;

export function assessSubjectLine(raw: string): SubjectAssessment {
  const subject = raw.replace(/\s+/g, " ").trim();
  if (!subject) {
    return {
      score: 0,
      rating: "Needs a rewrite",
      notes: ["Type a subject line. The check stays in this browser."],
      examples: [],
    };
  }

  const notes: string[] = [];
  let score = 100;

  const letters = subject.replace(/[^A-Za-z]/g, "");
  const shouty = letters.length >= 8 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6;
  if (shouty) {
    score -= 20;
    notes.push("Most of this is capital letters. A normal sentence is easier to read.");
  }

  const bangs = (subject.match(/!/g) || []).length;
  const questions = (subject.match(/\?/g) || []).length;
  if (bangs > 1 || questions > 1) {
    score -= 15;
    notes.push("One question mark or exclamation is enough. A pile of them reads like a flyer.");
  }

  const emojis = subject.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
  if (emojis > 2) {
    score -= 10;
    notes.push(`${emojis} emojis is a lot for a subject. One, or none, is clearer.`);
  }

  if (subject.length > 60) {
    score -= 15;
    notes.push(
      `${subject.length} characters. Many phone inboxes show about 40–50 before cutting the rest. That is a display limit, not an open-rate forecast.`,
    );
  } else if (subject.length < 15) {
    score -= 10;
    notes.push("Very short. Name the actual offer, event, or change.");
  }

  if (VAGUE.test(subject)) {
    score -= 40;
    notes.push("This could be any email. Say what the reader gets, or what changed.");
  }

  if (PRESSURE.test(subject)) {
    score -= 15;
    notes.push("Pressure phrases (“act now”, “click here”, “limited time”) are a common spam pattern. They do not by themselves block a message.");
  }

  if (/\{\{[^}]+\}\}|%\w+%|\[(first name|name|fname)\]/i.test(subject)) {
    notes.push(
      "Personalization only helps when every recipient has that field. A leftover token looks broken.",
    );
  }

  if (notes.length === 0) {
    notes.push("Length and wording look plain enough to send. This checklist does not predict results.");
  }

  score = Math.max(0, Math.min(100, score));
  const rating: SubjectRating = score >= 80 ? "Clear" : score >= 70 ? "Usable" : "Needs a rewrite";

  return { score, rating, notes, examples: examplesFor(subject, shouty) };
}

function examplesFor(subject: string, shouty: boolean): string[] {
  if (VAGUE.test(subject)) {
    return [
      "This week’s [offer] at [your business]",
      "Saturday: [what changed], [what to do]",
    ];
  }
  const softened = soften(subject, shouty);
  const clipped = clip(softened);
  const out: string[] = [];
  if (clipped !== subject) out.push(clipped);
  return out.slice(0, 2);
}

function soften(subject: string, shouty: boolean): string {
  let next = subject.replace(/!+/g, "").replace(/\?{2,}/g, "?").replace(/\s+/g, " ").trim();
  if (shouty) {
    next = next.charAt(0).toUpperCase() + next.slice(1).toLowerCase();
  }
  return next;
}

function clip(subject: string): string {
  if (subject.length <= 52) return subject;
  const cut = subject.slice(0, 48);
  const space = cut.lastIndexOf(" ");
  const base = (space > 24 ? cut.slice(0, space) : cut).replace(/[,\s]+$/, "");
  return base;
}
