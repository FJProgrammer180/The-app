"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FolderKanban,
  Gauge,
  Images,
  LogOut,
  Mail,
  Menu,
  Settings,
  X,
} from "lucide-react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/posts", label: "Articles", icon: BookOpen },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({
  brandName,
  email,
  unreadCount,
  signOut,
  children,
}: {
  brandName: string;
  email: string;
  unreadCount: number;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, "exact" in item ? item.exact : false);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            <Icon
              className={cn("size-4 shrink-0", active ? "text-accent" : "text-muted-soft")}
              aria-hidden
            />
            <span className="flex-1">{item.label}</span>
            {item.href === "/admin/messages" && unreadCount > 0 ? (
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-accent">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-3 border-t border-line pt-4">
      <div className="px-1">
        <p className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-soft">Signed in as</p>
        <p className="mt-1 truncate text-xs text-foreground/85" title={email}>
          {email}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="flex-1 justify-start px-2">
          <Link href="/" target="_blank" rel="noreferrer">
            View site ↗
          </Link>
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="px-2" aria-label="Sign out">
            <LogOut className="size-4" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-background-soft/60 px-4 py-6 lg:flex">
        <div className="mb-8 px-1">
          <Logo name={brandName} />
          <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-soft">
            Control room
          </p>
        </div>
        {nav}
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-background/85 px-4 backdrop-blur-xl lg:hidden">
          <Logo name={brandName} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-line text-foreground"
            aria-label="Open admin navigation"
          >
            <Menu className="size-4" aria-hidden />
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-background px-4 py-5">
              <div className="mb-6 flex items-center justify-between">
                <Logo name={brandName} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-line text-foreground"
                  aria-label="Close admin navigation"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              {nav}
              {footer}
            </div>
          </div>
        ) : null}

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
