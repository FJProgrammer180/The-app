import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { EmptyState, LabelCaps } from "@/components/ui/primitives";
import { safeExternalUrl } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "About",
    description:
      settings.about.bio.slice(0, 155) ||
      `About ${settings.about.display_name} — background, interests and current focus.`,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const { about } = settings;

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
    <>
      <PageHeader
        eyebrow="03 — Profile"
        title={`${about.display_name}.`}
        description={about.role || undefined}
        meta={
          socials.length > 0 ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={social.href.startsWith("mailto:") ? undefined : "noreferrer noopener"}
                    className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-accent"
                  >
                    {social.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : null
        }
      />

      <Section className="pt-14">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <LabelCaps>Biography</LabelCaps>
              <div className="mt-5 space-y-5 whitespace-pre-line text-[1.02rem] leading-[1.8] text-muted">
                {about.bio}
              </div>
            </Reveal>

            <Reveal className="mt-12">
              <LabelCaps>Currently learning</LabelCaps>
              {about.learning.length > 0 ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {about.learning.map((item) => (
                    <li
                      key={item}
                      className="rounded-md border border-line bg-surface/40 px-4 py-3 text-sm text-foreground/85"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  No learning interests added yet. They can be edited in Admin → Settings.
                </p>
              )}
            </Reveal>

            <Reveal className="mt-12">
              <LabelCaps>Goals</LabelCaps>
              {about.goals.length > 0 ? (
                <ol className="mt-5 space-y-4">
                  {about.goals.map((goal, index) => (
                    <li key={goal} className="flex gap-4 border-b border-line/60 pb-4">
                      <span className="font-mono text-[0.65rem] text-accent/80">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[0.95rem] leading-relaxed text-muted">{goal}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-muted">No goals added yet.</p>
              )}
            </Reveal>
          </div>

          <div className="lg:col-span-5 lg:pl-10">
            <Reveal className="lg:sticky lg:top-24">
              <div className="rounded-lg border border-line bg-surface/40 p-6">
                <LabelCaps>Toolkit</LabelCaps>
                {about.skills.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {about.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full border border-line bg-background/70 px-2.5 py-1 text-[0.72rem] text-muted"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">No skills added yet.</p>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-line bg-surface/40 p-6">
                <LabelCaps>Next step</LabelCaps>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Working on something adjacent? A short note is the fastest way to start.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-5">
                  <Link href="/contact">Get in touch</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <Section className="border-t border-line/60">
        <SectionHeading
          index="—"
          eyebrow="Timeline"
          title="How the path unfolded."
          description="Maintained by hand in the dashboard — nothing here is generated or embellished."
        />
        {about.timeline.length > 0 ? (
          <Reveal className="relative ml-1 border-l border-line pl-8 sm:ml-3">
            {about.timeline.map((entry) => (
              <div key={`${entry.year}-${entry.title}`} className="relative pb-10 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[2.15rem] top-1.5 size-2 rounded-full border border-accent/60 bg-background"
                />
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent/80">
                  {entry.year}
                </p>
                <h3 className="mt-2 text-base font-medium text-foreground">{entry.title}</h3>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
                  {entry.description}
                </p>
              </div>
            ))}
          </Reveal>
        ) : (
          <EmptyState
            title="No timeline entries yet"
            description="Add milestones from Admin → Settings → About. Keep them factual — this section is part of the public profile."
          />
        )}
      </Section>
    </>
  );
}
