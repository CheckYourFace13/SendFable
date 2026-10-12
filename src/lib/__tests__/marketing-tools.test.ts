import assert from "node:assert/strict";
import test from "node:test";
import { assessSubjectLine } from "../tools/subject-line";
import { checkSpamCopy } from "../tools/spam-check";

test("subject line checklist does not invent an open rate", () => {
  const clear = assessSubjectLine("Saturday tasting: new saison on draft");
  assert.equal(clear.rating, "Clear");
  assert.ok(clear.score >= 80);
  assert.doesNotMatch(clear.notes.join(" "), /open rate|% of people/i);

  const vague = assessSubjectLine("Newsletter");
  assert.equal(vague.rating, "Needs a rewrite");
  assert.ok(vague.examples.length >= 1);

  const shout = assessSubjectLine("FREE BEER THIS WEEKEND ONLY!!!");
  assert.ok(shout.score < clear.score);
  assert.match(shout.notes.join(" "), /capital|exclamation/i);
});

test("spam checker flags patterns without calling them an automatic block", () => {
  const empty = checkSpamCopy("", "");
  assert.equal(empty.phrases.length, 0);
  assert.match(empty.suggestions.join(" "), /Nothing is saved/);

  const hit = checkSpamCopy("Act now", "Click here for a guaranteed winner!!!");
  assert.ok(hit.phrases.some((p) => p.label === "act now"));
  assert.ok(hit.phrases.some((p) => p.label === "click here"));
  assert.match(hit.phrases.map((p) => p.detail).join(" "), /does not automatically/i);
  assert.ok(hit.formatting.some((f) => /exclamation/i.test(f.label)));

  const links = checkSpamCopy(
    "Menu",
    "See https://a.example https://b.example https://c.example today",
  );
  assert.ok(links.formatting.some((f) => /links/i.test(f.label)));
});
