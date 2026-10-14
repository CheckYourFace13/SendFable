import assert from "node:assert/strict";
import test from "node:test";
import { validateInquiryEmail, type MailDnsLookup } from "../inquiry/email";
import { inquiryEmailProblem } from "../inquiry/email-syntax";
import {
  classifyInquirySpam,
  inquiryDuplicateKey,
  inquiryTokenError,
  issueInquiryToken,
} from "../inquiry/guard";

process.env.NEXTAUTH_SECRET ||= "inquiry-test-secret";

const okLookup: MailDnsLookup = async () => "ok";
const missingLookup: MailDnsLookup = async () => "missing";

test("inquiry email rejects malformed, placeholder, and missing-mail domains", async () => {
  for (const bad of ["", "not-an-email", "test@", "@test.com", "user @test.com", "user@test.com\n", "user@11.css"]) {
    const result = await validateInquiryEmail(bad, okLookup);
    assert.equal(result.ok, false, bad);
  }

  const reserved = await validateInquiryEmail("user@invalid-nonexistent-domain-example.invalid", okLookup);
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.equal(reserved.reason, "placeholder");

  const noMx = await validateInquiryEmail("user@invalid-nonexistent-domain-example.zzz", missingLookup);
  assert.equal(noMx.ok, false);
  if (!noMx.ok) assert.equal(noMx.reason, "dns");

  assert.equal(inquiryEmailProblem("not-an-email"), "syntax");
});

test("inquiry email accepts plus tags, subdomains, and longer TLDs when mail DNS exists", async () => {
  const plus = await validateInquiryEmail("first.last+tag@mail.example-valid-test-domain.email", okLookup);
  assert.equal(plus.ok, true);
  if (plus.ok) assert.equal(plus.email, "first.last+tag@mail.example-valid-test-domain.email");

  const tld = await validateInquiryEmail("owner@shop.museum", okLookup);
  assert.equal(tld.ok, true);

  const subdomain = await validateInquiryEmail("a.b@news.company.co", okLookup);
  assert.equal(subdomain.ok, true);
});

test("inquiry DNS failure does not reject a syntactically valid address", async () => {
  const flaky: MailDnsLookup = async () => "unknown";
  const result = await validateInquiryEmail("owner@shop.museum", flaky);
  assert.equal(result.ok, true);
});

test("inquiry token rejects missing, instant, and stale submissions", () => {
  const now = 1_700_000_000_000;
  assert.match(inquiryTokenError("support", undefined, now) || "", /refresh/i);
  const fresh = issueInquiryToken("support", now);
  assert.match(inquiryTokenError("support", fresh, now + 500) || "", /wait/i);
  assert.equal(inquiryTokenError("support", fresh, now + 3_000), null);
  assert.match(inquiryTokenError("support", fresh, now + 3 * 60 * 60 * 1000) || "", /refresh/i);
  assert.match(inquiryTokenError("support", `${fresh}x`, now + 3_000) || "", /refresh/i);
});

test("obvious inquiry spam is classified and uncertain security reports are not", () => {
  assert.equal(classifyInquirySpam("We offer SEO services and backlinks for your site"), "SPAM");
  assert.equal(classifyInquirySpam("I found an open redirect on the login page. Steps to reproduce are attached."), "OK");
  assert.equal(
    inquiryDuplicateKey("a@b.co", "Hello   there"),
    inquiryDuplicateKey("a@b.co", "hello there"),
  );
});
