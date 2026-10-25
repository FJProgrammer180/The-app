import type { Metadata } from "next";

import { ContactForm } from "@/components/site/contact-form";
import { PageHeader } from "@/components/site/page-header";
import { Alert } from "@/components/ui/primitives";
import { safeExternalUrl } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/env";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a conversation about a project, collaboration or an idea worth building.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const configured = isSupabaseConfigured();

  const channels = [
    { label: "GitHub", href: safeExternalUrl(settings.social.github) },
    { label: "X", href: safeExternalUrl(settings.social.x) },
    { label: "LinkedIn", href: safeExternalUrl(settings.social.linkedin) },
    {
      label: "Email",
      href: settings.social.email ? `mailto:${settings.social.email}` : null,
    },
  ].filter((entry): entry is { label: string; href: string } => Boolean(entry.href));

  return (
    <>
      <PageHeader
        eyebrow="04 — Contact"
        title={settings.contact.heading}
        description={settings.contact.intro}
      />

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {!configured ? (
            <Alert tone="warning" title="Contact form is not connected yet" className="mb-8">
              Supabase credentials are missing, so messages cannot be stored. Add
              <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>
              and
              <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              to your environment, apply the migrations, then reload this page.
            </Alert>
          ) : null}

          <ContactForm />
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-line bg-surface/40 p-6">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-soft">
              Direct channels
            </p>
            {channels.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm">
                {channels.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      target={channel.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={channel.href.startsWith("mailto:") ? undefined : "noreferrer noopener"}
                      className="group flex items-center justify-between text-muted transition-colors hover:text-foreground"
                    >
                      <span>{channel.label}</span>
                      <span aria-hidden className="text-accent opacity-0 transition-opacity group-hover:opacity-100">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Social links have not been configured yet. Add them under Admin → Settings, Social.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface/40 p-6">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-soft">
              How this works
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Messages are validated on the server and written to PostgreSQL. They are readable only
              by an authenticated administrator — there is no public inbox endpoint.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-surface/40 p-6">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-soft">
              Response time
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Typically within two working days. Include a link to anything already in progress so
              the reply can be specific.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
