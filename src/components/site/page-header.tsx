import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "relative border-b border-line/70 pb-12 pt-32 sm:pt-36 md:pb-16",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <p className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-accent/80">
          {eyebrow}
        </p>
        <h1 className="max-w-3xl text-title font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-6">{meta}</div> : null}
        {children}
      </div>
    </header>
  );
}
