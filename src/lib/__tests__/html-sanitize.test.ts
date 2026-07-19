import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeEmailHtml } from "../html-sanitize";

describe("sanitizeEmailHtml", () => {
  it("strips script tags and content", () => {
    const out = sanitizeEmailHtml('<p>Hi</p><script>alert(1)</script><p>Bye</p>');
    assert.match(out, /Hi/);
    assert.match(out, /Bye/);
    assert.doesNotMatch(out, /script/i);
    assert.doesNotMatch(out, /alert/);
  });

  it("strips iframe tags", () => {
    const out = sanitizeEmailHtml('<p>x</p><iframe src="https://evil.test"></iframe>');
    assert.doesNotMatch(out, /iframe/i);
  });

  it("strips on* event handlers", () => {
    const out = sanitizeEmailHtml('<a href="https://ok.test" onclick="alert(1)">Go</a>');
    assert.doesNotMatch(out, /onclick/i);
    assert.match(out, /https:\/\/ok\.test/);
  });

  it("neutralizes javascript: URLs", () => {
    const out = sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>');
    assert.doesNotMatch(out, /javascript:/i);
    assert.match(out, /#blocked-/);
  });

  it("handles empty input", () => {
    assert.equal(sanitizeEmailHtml(""), "");
    assert.equal(sanitizeEmailHtml(null), "");
    assert.equal(sanitizeEmailHtml(undefined), "");
  });
});
