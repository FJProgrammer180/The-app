import type { Heading } from "@/lib/content";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length < 2) return null;

  return (
    <nav aria-labelledby="toc-heading" className="rounded-lg border border-line bg-surface/40 p-5">
      <h2
        id="toc-heading"
        className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-soft"
      >
        In this article
      </h2>
      <ol className="mt-4 space-y-2 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-4" : undefined}>
            <a
              href={`#${heading.id}`}
              className="text-muted transition-colors hover:text-foreground"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
