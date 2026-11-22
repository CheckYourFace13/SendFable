"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  OFFICIAL_VIDEOS,
  type OfficialVideoId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from "@/data/official-videos";
import { cn } from "@/lib/utils";

/**
 * Click-to-load YouTube embed — no iframe / YouTube JS until the visitor plays.
 * Never autoplays on load.
 */
export function YoutubeEmbed({
  videoId,
  className,
  showWatchLink = true,
}: {
  videoId: OfficialVideoId;
  className?: string;
  showWatchLink?: boolean;
}) {
  const video = OFFICIAL_VIDEOS[videoId];
  const [playing, setPlaying] = useState(false);
  const thumb = youtubeThumbnailUrl(video.youtubeId);
  const isVertical = video.aspect === "vertical";

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-ink/10 bg-ink/5 shadow-sm",
          isVertical ? "mx-auto aspect-[9/16] max-w-xs" : "aspect-video w-full"
        )}
      >
        {playing ? (
          <iframe
            title={video.title}
            src={youtubeEmbedUrl(video.youtubeId)}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="group absolute inset-0 flex w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${video.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt=""
              width={isVertical ? 480 : 1280}
              height={isVertical ? 854 : 720}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <span className="absolute inset-0 bg-ink/25 transition group-hover:bg-ink/35" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-coral-solid text-white shadow-lg transition group-hover:scale-105 sm:h-16 sm:w-16">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-7 w-7 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      {showWatchLink ? (
        <p className="mt-2 text-center text-sm text-ink/60">
          <Link
            href={video.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-coral underline-offset-2 hover:underline"
          >
            Watch on YouTube
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Server-friendly section shell around the client embed. */
export function VideoSection({
  videoId,
  heading,
  support,
  children,
  className,
}: {
  videoId: OfficialVideoId;
  heading: string;
  support: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-ink/10 bg-page", className)}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
        <h2 className="font-display text-display-md text-ink text-balance">{heading}</h2>
        <p className="mt-3 max-w-prose text-charcoal/75">{support}</p>
        <div className="mt-8">
          <YoutubeEmbed videoId={videoId} />
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
