import Link from "next/link";

import { Badge, LabelCaps } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-accent/80">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "accent" | "warning";
}) {
  const content = (
    <div
      className={cn(
        "h-full rounded-lg border border-line bg-surface/50 p-5 transition-colors",
        href && "hover:border-line-strong",
        tone === "accent" && "border-accent/25 bg-accent-soft/20",
        tone === "warning" && "border-[#fbbf24]/25 bg-[#fbbf24]/[0.06]",
      )}
    >
      <LabelCaps>{label}</LabelCaps>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted-soft">{hint}</p> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full focus-visible:outline-none">
      {content}
    </Link>
  ) : (
    content
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <Badge variant={status === "published" ? "success" : "warning"}>
      {status === "published" ? "Published" : "Draft"}
    </Badge>
  );
}

export function VisibilityBadge({ visible }: { visible: boolean }) {
  return (
    <Badge variant={visible ? "success" : "muted"}>{visible ? "Visible" : "Hidden"}</Badge>
  );
}

export function AdminTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface/40">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
