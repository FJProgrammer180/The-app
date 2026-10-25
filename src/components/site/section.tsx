import Link from "next/link";

import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative py-16 sm:py-20 md:py-24", className)}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  index?: string;
  eyebrow: string;
  title?: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-10 flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          {index ? (
            <span className="font-mono text-[0.65rem] text-accent/80">{index}</span>
          ) : null}
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted-soft">
            {eyebrow}
          </span>
          <span className="h-px w-10 bg-line-strong" aria-hidden />
        </div>
        {title ? (
          <h2 className="text-heading font-semibold text-foreground">{title}</h2>
        ) : null}
        {description ? (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          {action.label}
          <span
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      ) : null}
    </Reveal>
  );
}
