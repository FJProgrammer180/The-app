import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface/60 backdrop-blur-[2px]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-base font-semibold tracking-tight text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm leading-relaxed text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-3 p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: "default" | "accent" | "success" | "warning" | "muted" }) {
  const variants = {
    default: "border-line-strong bg-surface-2 text-muted",
    accent: "border-accent/30 bg-accent-soft/60 text-accent",
    success: "border-success/25 bg-success/10 text-success",
    warning: "border-[#fbbf24]/25 bg-[#fbbf24]/10 text-[#fbbf24]",
    muted: "border-line bg-transparent text-muted-soft",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function LabelCaps({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="separator" className={cn("h-px w-full bg-line", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden {...props} />;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong bg-surface/40 px-6 py-12",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-muted">{description}</p>
      {action}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "error" | "success" | "warning";
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-accent/25 bg-accent-soft/40 text-foreground",
    error: "border-danger/30 bg-danger/10 text-foreground",
    success: "border-success/25 bg-success/10 text-foreground",
    warning: "border-[#fbbf24]/30 bg-[#fbbf24]/10 text-foreground",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
    >
      {title ? <p className="mb-1 font-medium">{title}</p> : null}
      <div className="text-muted [&_a]:text-accent [&_a]:underline">{children}</div>
    </div>
  );
}
