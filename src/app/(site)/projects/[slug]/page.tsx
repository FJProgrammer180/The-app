import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { ArrowUpRight, Code2 } from "lucide-react";

import { Cover } from "@/components/site/cover";
import { Markdown } from "@/components/site/markdown";
import { Alert } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDate, safeExternalUrl } from "@/lib/content";
import { getPublishedProjectBySlug } from "@/lib/queries/projects";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/** Request-scoped so the metadata pass and the render share one query. */
const loadProject = cache(async (slug: string) => getPublishedProjectBySlug(slug));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadProject(slug);
  if (!result.ok || !result.data) {
    if (result.ok) notFound();
    return { title: "Project unavailable", robots: { index: false, follow: false } };
  }
  const project = result.data;
  const images = project.cover_image_url?.startsWith("https://")
    ? [{ url: project.cover_image_url, alt: project.title }]
    : undefined;

  return {
    title: project.title,
    description: project.summary ?? undefined,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary ?? undefined,
      url: `/projects/${project.slug}`,
      images,
    },
  };
}

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [result, settings] = await Promise.all([loadProject(slug), getSiteSettings()]);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-36 sm:px-8">
        <Alert tone="error" title="This project could not be loaded">
          {result.code === "not_configured"
            ? "Supabase is not configured, so project details cannot be read."
            : "The content database did not respond. Please retry in a moment."}
        </Alert>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  const project = result.data;
  if (!project) notFound();

  const demo = safeExternalUrl(project.demo_url);
  const repository = safeExternalUrl(project.repository_url);
  const coverIsRenderable = Boolean(
    project.cover_image_url &&
      (project.cover_image_url.startsWith("/") || safeExternalUrl(project.cover_image_url)),
  );

  return (
    <article>
      <header className="relative border-b border-line/70 pb-12 pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              href="/projects"
              className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-accent"
            >
              ← Projects
            </Link>
          </nav>

          <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent/80">
            Case study · {formatDate(project.created_at)}
          </p>
          <h1 className="max-w-3xl text-title font-semibold text-foreground">{project.title}</h1>
          {project.summary ? (
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-muted">
              {project.summary}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {demo ? (
              <Button asChild size="sm" variant="accent">
                <a href={demo} target="_blank" rel="noreferrer noopener">
                  Visit live site <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              </Button>
            ) : null}
            {repository ? (
              <Button asChild size="sm" variant="outline">
                <a href={repository} target="_blank" rel="noreferrer noopener">
                  <Code2 className="size-3.5" aria-hidden /> Source code
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="ghost">
              <Link href="/contact">Discuss a similar build →</Link>
            </Button>
          </div>

          {project.technologies.length > 0 ? (
            <ul className="mt-8 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.7rem] text-muted"
                >
                  {tech}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-surface">
          {coverIsRenderable && project.cover_image_url ? (
            <Image
              src={project.cover_image_url}
              alt={`Cover artwork for ${project.title}`}
              fill
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-cover"
            />
          ) : (
            <Cover src={null} alt="" label="Project artwork" className="size-full" />
          )}
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0">
            {project.description ? (
              <Markdown content={project.description} />
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                A written case study for this project has not been added yet. Update the project in
                the dashboard to include the problem, approach and outcome.
              </p>
            )}
          </div>

          <aside className="order-first space-y-6 lg:order-last lg:sticky lg:top-24 lg:self-start">
            <dl className="space-y-4 rounded-lg border border-line bg-surface/40 p-5 text-sm">
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-soft">
                  Studio
                </dt>
                <dd className="mt-1 text-foreground/85">{settings.about.display_name}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-soft">
                  Published
                </dt>
                <dd className="mt-1 text-foreground/85">{formatDate(project.created_at)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-soft">
                  Stack
                </dt>
                <dd className="mt-1 text-foreground/85">
                  {project.technologies.length > 0 ? project.technologies.join(", ") : "—"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </article>
  );
}
