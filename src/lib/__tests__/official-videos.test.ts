import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OFFICIAL_VIDEOS, youtubeEmbedUrl, youtubeThumbnailUrl } from "@/data/official-videos";
import { videoObjectJsonLd } from "@/components/marketing/json-ld";

describe("official SendFable videos", () => {
  it("keeps Short YouTube-only and embeds the four conversion videos once each", () => {
    assert.equal(OFFICIAL_VIDEOS.short.sitePath, null);
    assert.equal(OFFICIAL_VIDEOS.overview.sitePath, "/");
    assert.equal(OFFICIAL_VIDEOS.scribe.sitePath, "/automated-email-marketing");
    assert.equal(OFFICIAL_VIDEOS["free-tools"].sitePath, "/tools");
    assert.equal(OFFICIAL_VIDEOS.pricing.sitePath, "/pricing");

    const home = readFileSync(join(process.cwd(), "src/app/(marketing)/page.tsx"), "utf8");
    assert.match(home, /videoId="overview"/);
    assert.doesNotMatch(home, /videoId="scribe"/);
    assert.doesNotMatch(home, /videoId="pricing"/);
    assert.doesNotMatch(home, /videoId="free-tools"/);
    assert.doesNotMatch(home, /2eRqsXkX9tU/);
  });

  it("builds click-to-load embed URLs without inventing uploadDate", () => {
    const id = OFFICIAL_VIDEOS.overview.youtubeId;
    assert.match(youtubeThumbnailUrl(id), new RegExp(id));
    assert.match(youtubeEmbedUrl(id), /youtube-nocookie\.com\/embed/);
    const schema = videoObjectJsonLd({
      name: OFFICIAL_VIDEOS.overview.title,
      description: OFFICIAL_VIDEOS.overview.description,
      youtubeId: id,
      watchUrl: OFFICIAL_VIDEOS.overview.watchUrl,
      pagePath: "/",
    });
    assert.equal(schema["@type"], "VideoObject");
    assert.equal("uploadDate" in schema, false);
  });

  it("never mounts an iframe until the visitor clicks play", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/marketing/youtube-embed.tsx"),
      "utf8"
    );
    assert.match(src, /useState\(false\)/);
    assert.match(src, /Play video:/);
    assert.match(src, /\{playing \? \(/);
    assert.doesNotMatch(src, /muted[\s-]autoplay/i);
  });
});
