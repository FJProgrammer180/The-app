import Link from "next/link";

import { CinematicBackground } from "@/components/site/cinematic-background";
import { HeroVisual } from "@/components/site/hero-visual";
import { Button } from "@/components/ui/button";
import { safeInternalPath } from "@/lib/content";
import type { HeroMedia } from "@/lib/hero-media";
import type { SiteSettings } from "@/types";

export function SiteHero({
  settings,
  media,
}: {
  settings: SiteSettings;
  media: HeroMedia;
}) {
  const { home, brand } = settings;

  return (
    <section
      className="hero-grain relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden pt-24"
      aria-labelledby="hero-heading"
    >
      <CinematicBackground videoSrc={media.videoSrc} posterSrc={media.posterSrc} />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-y-6 px-5 pb-16 sm:px-8 lg:grid-cols-12 lg:gap-x-8">
        <div className="relative z-10 lg:col-span-7 xl:col-span-6">
          <div
            className="mb-6 inline-flex items-center gap-3 rounded-full border border-line-strong/80 bg-background/40 px-3.5 py-1.5 backdrop-blur-sm animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted">
              {home.eyebrow || brand.tagline}
            </span>
          </div>

          <h1
            id="hero-heading"
            className="text-display font-semibold text-foreground animate-fade-up"
            style={{ animationDelay: "140ms" }}
          >
            {home.headline}
          </h1>

          <p
            className="mt-6 max-w-xl text-[1.02rem] leading-[1.7] text-muted animate-fade-up sm:text-[1.09rem]"
            style={{ animationDelay: "240ms" }}
          >
            {home.intro}
          </p>

          <div
            className="mt-9 flex flex-col gap-3 animate-fade-up sm:flex-row sm:items-center"
            style={{ animationDelay: "340ms" }}
          >
            <Button asChild size="lg" variant="primary">
              <Link href={safeInternalPath(home.primary_cta_href, "/projects")}>
                {home.primary_cta_label}
                <span aria-hidden className="ml-1">→</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="justify-start sm:justify-center">
              <Link href={safeInternalPath(home.secondary_cta_href, "/blog")}>
                {home.secondary_cta_label}
                <span aria-hidden className="ml-1 text-accent">↗</span>
              </Link>
            </Button>
          </div>

          <dl
            className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-line/80 pt-6 animate-fade-up"
            style={{ animationDelay: "440ms" }}
          >
            {[
              { label: "Focus", value: "Systems & AI" },
              { label: "Practice", value: "Design engineering" },
              { label: "Status", value: "Open to work" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-soft">
                  {item.label}
                </dt>
                <dd className="mt-1.5 text-[0.8rem] text-foreground/85">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative order-first h-[38svh] w-full lg:order-last lg:col-span-5 lg:h-[74svh] xl:col-span-6">
          <HeroVisual className="absolute inset-0" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex">
        <div className="flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-soft">
          <span className="h-8 w-px bg-gradient-to-b from-transparent via-line-strong to-transparent" />
          Scroll to explore
        </div>
      </div>
    </section>
  );
}
