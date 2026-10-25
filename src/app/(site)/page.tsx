import Link from "next/link";
import type { Metadata } from "next";

import { PostCard } from "@/components/site/post-card";
import { ProjectCard } from "@/components/site/project-card";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeading } from "@/components/site/section";
import { SiteHero } from "@/components/site/hero";
import { Alert, EmptyState, LabelCaps } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { resolveHeroMedia } from "@/lib/hero-media";
import { listPublishedPosts } from "@/lib/queries/posts";
import { listPublishedProjects } from "@/lib/queries/projects";
import { getSiteSettings } from "@/lib/settings";
import type { Post, Project } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = `${settings.brand.name} — ${settings.brand.tagline}`;
  return {
    title: { absolute: title },
    description: settings.home.intro,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description: settings.home.intro,
      url: "/",
      type: "website",
    },
  };
}

export default async function HomePage() {
  const [settings, media, projectsResult, postsResult] = await Promise.all([
    getSiteSettings(),
    resolveHeroMedia(),
    listPublishedProjects({ limit: 6 }),
    listPublishedPosts({ page: 1, perPage: 3 }),
  ]);

  const projects: Project[] = projectsResult.ok ? projectsResult.data : [];
  const posts: Post[] = postsResult.ok ? postsResult.data.posts : [];
  const featured = [...projects]
    .sort((a, b) => {
      const aFeatured = a.featured_order > 0 ? a.featured_order : Number.MAX_SAFE_INTEGER;
      const bFeatured = b.featured_order > 0 ? b.featured_order : Number.MAX_SAFE_INTEGER;
      return aFeatured - bFeatured;
    })
    .slice(0, 3);

  const contentUnavailable =
    (!projectsResult.ok && projectsResult.code === "query_failed") ||
    (!postsResult.ok && postsResult.code === "query_failed");

  const { about } = settings;

  return (
    <>
      <SiteHero settings={settings} media={media} />

      {contentUnavailable ? (
        <div className="mx-auto w-full max-w-6xl px-5 pt-12 sm:px-8">
          <Alert tone="warning" title="Some content is temporarily unavailable">
            The content database could not be reached. The rest of the site — navigation, pages and
            the contact form — remains available. Public content will reappear as soon as the
            connection is restored.
          </Alert>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- Work */}
      <Section id="work">
        <SectionHeading
          index="01"
          eyebrow="Selected work"
          title="Projects engineered with intent."
          description="A small, deliberate collection. Each case study covers the problem, the build and what changed as a result."
          action={{ href: "/projects", label: "All projects" }}
        />

        {featured.length > 0 ? (
          <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" staggerChildren>
            {featured.map((project, index) => (
              <div key={project.id} data-reveal-item className="h-full">
                <ProjectCard project={project} index={index} />
              </div>
            ))}
          </Reveal>
        ) : (
          <EmptyState
            title="No projects published yet"
            description="Published projects appear here automatically. Add your first project from the admin dashboard and it will show up immediately."
            action={
              <Button asChild variant="subtle" size="sm">
                <Link href="/admin/projects">Open project manager</Link>
              </Button>
            }
          />
        )}
      </Section>

      {/* --------------------------------------------------------------- About */}
      <Section className="border-y border-line/60 bg-background-soft/40">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-accent/80">
                02 — Profile
              </p>
              <h2 className="text-heading font-semibold text-foreground">
                {about.display_name}
                <span className="block text-muted"> {about.role}</span>
              </h2>
              <p className="mt-5 max-w-md whitespace-pre-line text-[0.95rem] leading-relaxed text-muted">
                {about.bio}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-7">
                <Link href="/about">More about my path</Link>
              </Button>
            </Reveal>
          </div>

          <div className="lg:col-span-7 lg:pl-10">
            <Reveal className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
              <div className="bg-background p-6">
                <LabelCaps>Currently learning</LabelCaps>
                <ul className="mt-4 space-y-2.5 text-sm text-foreground/85">
                  {(about.learning.length > 0
                    ? about.learning
                    : ["Add learning interests in Settings"]
                  ).map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-background p-6">
                <LabelCaps>Working towards</LabelCaps>
                <ul className="mt-4 space-y-2.5 text-sm text-foreground/85">
                  {(about.goals.length > 0 ? about.goals : ["Add goals in Settings"]).map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-violet" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-background p-6 sm:col-span-2">
                <LabelCaps>Toolkit</LabelCaps>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {(about.skills.length > 0
                    ? about.skills
                    : ["TypeScript", "React", "Next.js", "Three.js", "Supabase"]
                  ).map((skill) => (
                    <li
                      key={skill}
                      className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.7rem] text-muted"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------- Writing */}
      <Section id="writing">
        <SectionHeading
          index="03"
          eyebrow="Writing"
          title="Notes from the build."
          description="Experiments, engineering decisions and the occasional post-mortem — published from the same dashboard that runs this site."
          action={{ href: "/blog", label: "Read the blog" }}
        />

        {posts.length > 0 ? (
          <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" staggerChildren>
            {posts.map((post, index) => (
              <div key={post.id} data-reveal-item className="h-full">
                <PostCard post={post} priority={index === 0} />
              </div>
            ))}
          </Reveal>
        ) : (
          <EmptyState
            title="The library is empty"
            description="Nothing has been published yet. Drafts stay private until you publish them from the admin dashboard."
            action={
              <Button asChild variant="subtle" size="sm">
                <Link href="/admin/posts/new">Write the first article</Link>
              </Button>
            }
          />
        )}
      </Section>

      {/* ------------------------------------------------------------- Contact */}
      <Section className="pb-24">
        <Reveal className="relative overflow-hidden rounded-xl border border-line bg-[radial-gradient(120%_120%_at_80%_0%,#10242c_0%,#0b1018_55%,#080a0f_100%)] px-6 py-14 sm:px-12">
          <div className="absolute -right-16 -top-20 size-64 rounded-full bg-accent/10 blur-3xl" aria-hidden />
          <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-accent/80">
            04 — Contact
          </p>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-title font-semibold text-foreground">
                Have something worth building?
              </h2>
              <p className="mt-4 text-[0.98rem] leading-relaxed text-muted">
                {settings.contact.intro}
              </p>
            </div>
            <Button asChild size="lg" variant="accent" className="shrink-0">
              <Link href="/contact">Start a conversation</Link>
            </Button>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
