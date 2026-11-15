import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  requiresRewrite,
  rewrittenAddress,
  platformSendDomain,
  domainOf,
} from "@/lib/dmarc";
import { resolveFromHeaders } from "@/lib/identities";
import {
  startOfChicagoDay,
  isPastChicagoReportHour,
  isPastChicagoWeeklyReportSlot,
} from "@/lib/acquisition/report";

describe("DMARC-safe From rewrite helpers", () => {
  it("rewrites strict public mailbox providers", () => {
    assert.equal(requiresRewrite("chris@gmail.com"), true);
    assert.equal(requiresRewrite("owner@iscreamstudio.com"), false);
    assert.equal(domainOf("a@iscreamstudio.com"), "iscreamstudio.com");
    const rewritten = rewrittenAddress("chris@iscreamstudio.com");
    assert.match(rewritten, new RegExp(`^chris@${platformSendDomain()}$`));
  });

  it("resolveFromHeaders uses display name and Reply-To when rewriteRequired", () => {
    const out = resolveFromHeaders({
      value: "chris@iscreamstudio.com",
      displayName: "BoatingChicago",
      rewriteRequired: true,
    });
    assert.match(out.from, /^BoatingChicago </);
    assert.match(out.from, new RegExp(`@${platformSendDomain().replace(/\./g, "\\.")}>$`));
    assert.equal(out.replyTo, "chris@iscreamstudio.com");
  });
});

describe("acquisition daily report Chicago timing", () => {
  it("startOfChicagoDay lands on Chicago midnight", () => {
    // 2026-10-06 18:00 UTC = mid-afternoon Chicago CDT
    const mid = new Date("2026-10-06T18:00:00.000Z");
    const start = startOfChicagoDay(mid);
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(start).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
    ) as Record<string, string>;
    assert.equal(parts.year, "2026");
    assert.equal(parts.month, "10");
    assert.equal(parts.day, "06");
    assert.equal(Number(parts.hour === "24" ? "0" : parts.hour), 0);
    assert.equal(Number(parts.minute), 0);
  });

  it("isPastChicagoReportHour gates before 16:00 Chicago", () => {
    // 2026-10-06 15:00 America/Chicago = 20:00 UTC (CDT)
    const before = new Date("2026-10-06T19:00:00.000Z"); // 14:00 CDT
    const after = new Date("2026-10-06T21:30:00.000Z"); // 16:30 CDT
    assert.equal(isPastChicagoReportHour(before), false);
    assert.equal(isPastChicagoReportHour(after), true);
  });

  it("isPastChicagoWeeklyReportSlot is Friday after 18:00 Chicago only", () => {
    // Friday 2026-11-13 17:00 CT = 23:00 UTC (CST)
    const friBefore = new Date("2026-11-13T23:00:00.000Z");
    // Friday 2026-11-13 18:05 CT = 00:05 UTC Sat
    const friAfter = new Date("2026-11-14T00:05:00.000Z");
    // Saturday 2026-11-14 19:00 CT
    const saturday = new Date("2026-11-15T01:00:00.000Z");
    assert.equal(isPastChicagoWeeklyReportSlot(friBefore), false);
    assert.equal(isPastChicagoWeeklyReportSlot(friAfter), true);
    assert.equal(isPastChicagoWeeklyReportSlot(saturday), false);
  });
});
