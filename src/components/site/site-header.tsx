"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/projects", label: "Work", index: "01" },
  { href: "/blog", label: "Writing", index: "02" },
  { href: "/about", label: "About", index: "03" },
  { href: "/contact", label: "Contact", index: "04" },
] as const;

export function SiteHeader({ brandName }: { brandName: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-line/80 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Logo name={brandName} />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "group relative rounded-full px-3.5 py-2 text-[0.83rem] transition-colors",
                isActive(link.href) ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              <span className="mr-1.5 font-mono text-[0.6rem] text-muted-soft transition-colors group-hover:text-accent">
                {link.index}
              </span>
              {link.label}
              <span
                className={cn(
                  "absolute inset-x-3.5 -bottom-0.5 h-px origin-left scale-x-0 bg-accent/70 transition-transform duration-300 group-hover:scale-x-100",
                  isActive(link.href) && "scale-x-100",
                )}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href="/contact">Start a project</Link>
          </Button>

          <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full border border-line text-foreground transition-colors hover:border-line-strong md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md data-[state=open]:animate-[fade-in_150ms_ease]" />
              <DialogPrimitive.Content
                className="fixed inset-x-0 top-0 z-50 border-b border-line bg-background px-5 pb-8 pt-5 shadow-2xl"
                aria-describedby={undefined}
              >
                <div className="flex items-center justify-between">
                  <DialogPrimitive.Title asChild>
                    <Logo name={brandName} />
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close
                    className="inline-flex size-10 items-center justify-center rounded-full border border-line text-foreground"
                    aria-label="Close navigation menu"
                  >
                    <X className="size-5" aria-hidden />
                  </DialogPrimitive.Close>
                </div>
                <nav aria-label="Mobile" className="mt-8 flex flex-col">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-baseline justify-between border-b border-line/70 py-4 text-lg text-foreground"
                    >
                      <span>{link.label}</span>
                      <span className="font-mono text-[0.65rem] text-muted-soft">{link.index}</span>
                    </Link>
                  ))}
                </nav>
                <Button asChild variant="accent" className="mt-6 w-full" size="lg">
                  <Link href="/contact">Start a project</Link>
                </Button>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  );
}
