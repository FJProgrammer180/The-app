import Link from "next/link";

import { Logo } from "@/components/site/logo";
import { safeExternalUrl } from "@/lib/content";
import type { SiteSettings } from "@/types";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const socials = [
    { label: "GitHub", href: safeExternalUrl(settings.social.github) },
    { label: "X", href: safeExternalUrl(settings.social.x) },
    { label: "LinkedIn", href: safeExternalUrl(settings.social.linkedin) },
    {
      label: "Email",
      href: settings.social.email ? `mailto:${settings.social.email}` : null,
    },
  ].filter((entry): entry is { label: string; href: string } => Boolean(entry.href));

  return (
    <footer className="relative mt-24 border-t border-line bg-background-soft/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo name={settings.brand.name} />
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {settings.brand.tagline || "A personal digital universe."}
            </p>
            {socials.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={social.href.startsWith("mailto:") ? undefined : "noreferrer noopener"}
                      className="text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Footer" className="space-y-3">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted-soft">
              Explore
            </p>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/projects", label: "Projects" },
                { href: "/blog", label: "Writing" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted-soft">
              Elsewhere
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/admin/login" className="text-muted transition-colors hover:text-foreground">
                  Admin sign in
                </Link>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  className="text-muted transition-colors hover:text-foreground"
                >
                  Sitemap
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line/70 pt-6 text-xs text-muted-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.brand.name}. All rights reserved.
          </p>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em]">
            Built with Next.js · Three.js · Supabase
          </p>
        </div>
      </div>
    </footer>
  );
}
