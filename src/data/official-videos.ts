/**
 * Official SendFable product videos (iScream Studio / @iScreamStudioInc).
 * Site pricing and product copy remain the source of truth — do not transcribe
 * video narration into plan prices or limits.
 */

export type OfficialVideoId =
  | "overview"
  | "scribe"
  | "free-tools"
  | "pricing"
  | "short";

export type OfficialVideo = {
  id: OfficialVideoId;
  youtubeId: string;
  title: string;
  description: string;
  watchUrl: string;
  /** Landscape 16:9 or vertical short */
  aspect: "landscape" | "vertical";
  /** Where this video is embedded on sendfable.com (null = YouTube-only). */
  sitePath: string | null;
};

const YT = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const OFFICIAL_VIDEOS: Record<OfficialVideoId, OfficialVideo> = {
  overview: {
    id: "overview",
    youtubeId: "bfJ0Anqe2C8",
    title: "SendFable Overview — Email Without the Marketing-Software Headache",
    description:
      "A short tour of SendFable: email and text marketing for small businesses, without the marketing-software headache.",
    watchUrl: YT("bfJ0Anqe2C8"),
    aspect: "landscape",
    sitePath: "/",
  },
  scribe: {
    id: "scribe",
    youtubeId: "VX6DoB1sHVE",
    title: "SendFable Scribe — This Week's Special, Already Drafted",
    description:
      "How Scribe turns a website update into a campaign draft you review, then send now or schedule.",
    watchUrl: YT("VX6DoB1sHVE"),
    aspect: "landscape",
    sitePath: "/automated-email-marketing",
  },
  "free-tools": {
    id: "free-tools",
    youtubeId: "-Hf6HP2vAXo",
    title: "SendFable Free Tools — Subject Line Tester & More, No Account",
    description:
      "Try SendFable free tools such as the subject line tester and spam word checker — no account required.",
    watchUrl: YT("-Hf6HP2vAXo"),
    aspect: "landscape",
    sitePath: "/tools",
  },
  pricing: {
    id: "pricing",
    youtubeId: "kfnLddV4kf0",
    title: "SendFable — Start Free in 20 Seconds",
    description:
      "See how quickly you can start on SendFable Free. Current plan prices and limits are on the pricing page.",
    watchUrl: YT("kfnLddV4kf0"),
    aspect: "landscape",
    sitePath: "/pricing",
  },
  short: {
    id: "short",
    youtubeId: "2eRqsXkX9tU",
    title: "SendFable starts free — 20 seconds",
    description: "A short clip: SendFable starts free.",
    watchUrl: YT("2eRqsXkX9tU"),
    aspect: "vertical",
    /** Intentionally not embedded — would duplicate the pricing landscape video. */
    sitePath: null,
  },
};

export function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(youtubeId: string): string {
  const q = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${q.toString()}`;
}
