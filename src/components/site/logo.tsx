import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  name,
  className,
  href = "/",
}: {
  name: string;
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-baseline gap-2.5", className)}
      aria-label={`${name} — home`}
    >
      <span className="relative mt-1 inline-block size-2 rounded-full bg-accent shadow-[0_0_12px_2px_rgba(100,227,240,0.45)] transition-transform duration-300 group-hover:scale-110" />
      <span className="text-[0.95rem] font-semibold uppercase tracking-[0.32em] text-foreground">
        {name}
      </span>
    </Link>
  );
}
