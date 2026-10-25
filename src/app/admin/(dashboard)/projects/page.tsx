import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AdminPageHeader, AdminTableShell, VisibilityBadge } from "@/components/admin/page-parts";
import { ProjectRowActions } from "@/components/admin/project-row-actions";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { listAdminProjects } from "@/lib/queries/projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const result = await listAdminProjects();

  return (
    <>
      <AdminPageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Ordered by featured position, then newest. Hidden projects stay accessible to administrators only."
        actions={
          <Button asChild size="sm" variant="accent">
            <Link href="/admin/projects/new">
              <Plus className="size-3.5" aria-hidden /> New project
            </Link>
          </Button>
        }
      />

      {!result.ok ? (
        <Alert tone="error" title="Projects could not be loaded">
          {result.error}
        </Alert>
      ) : result.data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Add your first project to populate the public gallery. Nothing here is invented on your behalf."
          action={
            <Button asChild size="sm" variant="subtle">
              <Link href="/admin/projects/new">Create a project</Link>
            </Button>
          }
        />
      ) : (
        <AdminTableShell>
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {["Project", "Visibility", "Order", "Stack", ""].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-2.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-soft"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((project) => (
                <tr key={project.id} className="border-b border-line/60 last:border-0 hover:bg-surface/40">
                  <td className="max-w-[22rem] px-4 py-3">
                    <Link
                      href={`/admin/projects/${project.id}/edit`}
                      className="block truncate font-medium text-foreground hover:text-accent"
                    >
                      {project.title}
                    </Link>
                    <p className="mt-0.5 truncate font-mono text-[0.62rem] text-muted-soft">
                      /projects/{project.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <VisibilityBadge visible={project.is_published} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{project.featured_order}</td>
                  <td className="max-w-[16rem] px-4 py-3 text-xs text-muted">
                    <span className="line-clamp-2">
                      {project.technologies.length > 0 ? project.technologies.join(", ") : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <ProjectRowActions project={project} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      )}
    </>
  );
}
