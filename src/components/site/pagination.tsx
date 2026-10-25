import Link from "next/link";

import { cn } from "@/lib/utils";

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  basePath,
  page,
  pageCount,
  params = {},
  className,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  params?: Record<string, string | undefined>;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (candidate) =>
      candidate === 1 ||
      candidate === pageCount ||
      Math.abs(candidate - page) <= 1,
  );

  return (
    <nav aria-label="Pagination" className={cn("mt-12 flex items-center justify-between gap-4", className)}>
      {page > 1 ? (
        <Link
          href={buildHref(basePath, params, page - 1)}
          rel="prev"
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
        >
          <span aria-hidden>←</span> Previous
        </Link>
      ) : (
        <span aria-hidden className="opacity-0">Previous</span>
      )}

      <ol className="flex items-center gap-1">
        {pages.map((candidate, index) => {
          const previous = pages[index - 1];
          const showGap = previous !== undefined && candidate - previous > 1;
          return (
            <li key={candidate} className="flex items-center gap-1">
              {showGap ? <span className="px-1 text-muted-soft">…</span> : null}
              <Link
                href={buildHref(basePath, params, candidate)}
                aria-current={candidate === page ? "page" : undefined}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full border text-sm transition-colors",
                  candidate === page
                    ? "border-accent/50 bg-accent-soft/60 text-foreground"
                    : "border-transparent text-muted hover:border-line hover:text-foreground",
                )}
              >
                {candidate}
              </Link>
            </li>
          );
        })}
      </ol>

      {page < pageCount ? (
        <Link
          href={buildHref(basePath, params, page + 1)}
          rel="next"
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
        >
          Next <span aria-hidden>→</span>
        </Link>
      ) : (
        <span aria-hidden className="opacity-0">Next</span>
      )}
    </nav>
  );
}
