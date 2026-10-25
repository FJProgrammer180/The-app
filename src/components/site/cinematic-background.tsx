"use client";

import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Cinematic video ground with a designed fallback.
 *
 * - muted, inline, looping, no audio track usage
 * - never intercepts pointer events (aria-hidden, pointer-events-none)
 * - falls back to the static poster/designed gradient when autoplay or the
 *   network is unavailable, so content always renders
 */
export function CinematicBackground({
  videoSrc,
  posterSrc,
  className,
}: {
  videoSrc: string | null;
  posterSrc: string | null;
  className?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);

  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    const saveData = connection?.saveData === true;
    const slowNetwork = connection?.effectiveType ? /2g/.test(connection.effectiveType) : false;

    if (prefersReducedMotion || saveData || slowNetwork) {
      // Decorative motion is skipped; the poster remains visible.
      setVideoFailed(true);
      return;
    }

    element.play().catch(() => setVideoFailed(true));
  }, []);

  const showVideo = Boolean(videoSrc) && !videoFailed;

  return (
    <div className={cn("absolute inset-0 -z-10 overflow-hidden bg-background", className)} aria-hidden>
      {/* Designed ground — always present, visible if the video never paints. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_-10%,#123241_0%,#0a121b_42%,#080a0f_78%)]" />
      <div className="hairline-grid absolute inset-0 opacity-70" />
      <div className="absolute left-1/2 top-[-18%] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[150px]" />
      <div className="absolute right-[-10%] top-1/3 h-[30rem] w-[30rem] rounded-full bg-violet/10 blur-[140px]" />

      {posterSrc ? (
        <Image
          src={posterSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cn(
            "object-cover opacity-55 transition-opacity duration-1000",
            videoReady && showVideo ? "opacity-0" : "opacity-55",
          )}
        />
      ) : null}

      {showVideo ? (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
            videoReady ? "opacity-60" : "opacity-0",
          )}
          src={videoSrc ?? undefined}
          poster={posterSrc ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      ) : null}

      {/* Contrast scrims: top for navigation, bottom to seat the hero copy. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
