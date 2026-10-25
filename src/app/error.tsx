"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface the error in the server/client logs without exposing internals.
    console.error("[nexora] route error:", error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-danger">Error</p>
      <h1 className="mt-4 text-3xl font-semibold text-foreground">Something interrupted the page.</h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        The request could not be completed. You can retry, or head back to a working page. If this
        keeps happening, check that the Supabase environment variables are configured.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-soft">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
