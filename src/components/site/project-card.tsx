import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Cover } from "@/components/site/cover";
import { safeExternalUrl } from "@/lib/content";
import type { Project } from "@/types";

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const demo = safeExternalUrl(project.demo_url);
  const repository = safeExternalUrl(project.repository_url);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong focus-within:border-accent/50">
      <Cover
        src={project.cover_image_url}
        alt={project.title}
        label={`Project ${String(index + 1).padStart(2, "0")}`}
        className="aspect-[4/3] w-full"
      />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground">
            <Link href={`/projects/${project.slug}`} className="hover:text-accent transition-colors">
              <span className="absolute inset-0" aria-hidden />
              {project.title}
            </Link>
          </h3>
          <span className="mt-1 shrink-0 font-mono text-[0.6rem] text-muted-soft">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        {project.summary ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">{project.summary}</p>
        ) : null}
        {project.technologies.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 4).map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-line bg-background/60 px-2 py-0.5 text-[0.625rem] text-muted"
              >
                {tech}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex items-center gap-4 pt-5 text-xs">
          {demo ? (
            <a
              href={demo}
              target="_blank"
              rel="noreferrer noopener"
              className="relative z-10 inline-flex items-center gap-1 text-muted transition-colors hover:text-accent"
            >
              Live demo <ArrowUpRight className="size-3" aria-hidden />
            </a>
          ) : null}
          {repository ? (
            <a
              href={repository}
              target="_blank"
              rel="noreferrer noopener"
              className="relative z-10 inline-flex items-center gap-1 text-muted transition-colors hover:text-accent"
            >
              Source <ArrowUpRight className="size-3" aria-hidden />
            </a>
          ) : null}
          {!demo && !repository ? (
            <span className="text-muted-soft">Case study</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
