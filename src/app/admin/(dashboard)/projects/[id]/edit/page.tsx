import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-parts";
import { ProjectForm } from "@/components/admin/project-form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { getAdminProjectById } from "@/lib/queries/projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit project" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  if (!UUID_PATTERN.test(id)) notFound();

  const result = await getAdminProjectById(id);

  if (!result.ok) {
    return (
      <>
        <AdminPageHeader title="Project unavailable" />
        <Alert tone="error" title="The project could not be loaded">
          {result.error}
        </Alert>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/admin/projects">Back to projects</Link>
        </Button>
      </>
    );
  }

  if (!result.data) notFound();
  const project = result.data;

  return (
    <>
      <AdminPageHeader
        eyebrow={`Projects / ${project.is_published ? "published" : "hidden"}`}
        title={project.title}
        description={`Editing /projects/${project.slug}.`}
        actions={
          <>
            {project.is_published ? (
              <Button asChild variant="subtle" size="sm">
                <Link href={`/projects/${project.slug}`} target="_blank" rel="noreferrer">
                  View live ↗
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/projects">← All projects</Link>
            </Button>
          </>
        }
      />
      {saved === "1" ? (
        <Alert tone="success" title="Project created" className="mb-6">
          Saved. Enable Published to make it visible on the public gallery.
        </Alert>
      ) : null}
      <ProjectForm project={project} />
    </>
  );
}
