import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Cover artwork with a designed fallback so cards never show a broken image.
 * Only absolute https URLs and on-site paths are rendered.
 */
export function Cover({
  src,
  alt,
  label,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  src: string | null | undefined;
  alt: string;
  label: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const isRenderable = Boolean(
    src && (src.startsWith("/") || /^https:\/\//.test(src)),
  );

  return (
    <div className={cn("relative overflow-hidden bg-surface", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_20%_0%,#14303a_0%,#0b1119_55%,#080a0f_100%)]" />
      <div className="hairline-grid absolute inset-0 opacity-40" />
      <div className="absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      {isRenderable && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex items-end p-5">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-soft">
            {label}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
    </div>
  );
}
