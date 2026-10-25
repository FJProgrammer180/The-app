import * as React from "react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  required,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-foreground/90">
          {label}
          {required ? (
            <span className="ml-1 text-accent" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {hint ? <span className="text-[0.68rem] text-muted-soft">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface/40", className)}>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  );
}
