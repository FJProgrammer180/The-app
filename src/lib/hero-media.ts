import "server-only";

import { access } from "node:fs/promises";
import path from "node:path";

export type HeroMedia = {
  videoSrc: string | null;
  posterSrc: string | null;
  /** Where the asset came from, used in the admin setup hints. */
  source: "local" | "env" | "none";
};

const LOCAL_CANDIDATES = ["/media/hero.mp4", "/media/hero.webm"];
const LOCAL_POSTER = "/media/hero-poster.jpg";

async function exists(publicPath: string): Promise<boolean> {
  try {
    await access(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the homepage background video.
 *
 * Priority: an explicitly configured URL, then a locally hosted file dropped
 * into `public/media/`. When nothing is available the caller renders the
 * designed background instead of a broken <video> element.
 */
export async function resolveHeroMedia(): Promise<HeroMedia> {
  const envVideo = process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim();
  const hasPoster = await exists(LOCAL_POSTER);
  const posterSrc = hasPoster ? LOCAL_POSTER : null;

  if (envVideo && /^https?:\/\//.test(envVideo)) {
    return { videoSrc: envVideo, posterSrc, source: "env" };
  }

  for (const candidate of LOCAL_CANDIDATES) {
    if (await exists(candidate)) {
      return { videoSrc: candidate, posterSrc, source: "local" };
    }
  }

  return { videoSrc: null, posterSrc, source: "none" };
}
