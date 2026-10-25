import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { ProjectCard } from "@/components/site/project-card";
import { Reveal } from "@/components/site/reveal";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { listPublishedProjects } from "@/lib/queries/projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Selected engineering work — case studies covering the problem, the build, and the outcome.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const result = await listPublishedProjects();
  const projects = result.ok ? result.data : [];

  return (
    <>
      <PageHeader
        eyebrow="01 — Work"
        title="Selected projects."
        description="A gallery of published work. Each entry links to a full case study with the engineering detail behind it."
        meta={
          result.ok ? (
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-soft">
              {projects.length} {projects.length === 1 ? "project" : "projects"} published
            </p>
          ) : null
        }
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        {!result.ok ? (
          <Alert tone="error" title="Projects could not be loaded">
            {result.code === "not_configured"
              ? "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the server."
              : "The content database did not respond. Please retry in a moment."}
          </Alert>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects published yet"
            description="Projects you publish from the admin dashboard appear here, ordered by their featured position."
          />
        ) : (
          <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" staggerChildren>
            {projects.map((project, index) => (
              <div key={project.id} data-reveal-item className="h-full">
                <ProjectCard project={project} index={index} />
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </>
  );
}
