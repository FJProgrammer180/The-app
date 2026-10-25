import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SiteNotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-5 py-32 sm:px-8">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-accent/80">404</p>
      <h1 className="mt-5 text-title font-semibold text-foreground">
        This page drifted out of orbit.
      </h1>
      <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed text-muted">
        The link may be outdated, or the article has been unpublished. Everything else is still
        where you left it.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/blog">Browse writing</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/projects">View projects</Link>
        </Button>
      </div>
    </div>
  );
}
