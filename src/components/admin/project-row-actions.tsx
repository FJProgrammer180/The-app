"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteProjectAction, updateProjectAction } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Project } from "@/types";

export function ProjectRowActions({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const toggleVisibility = async () => {
    setPending(true);
    const result = await updateProjectAction(project.id, {
      title: project.title,
      slug: project.slug,
      summary: project.summary ?? "",
      description: project.description ?? "",
      cover_image_url: project.cover_image_url ?? "",
      technologies: project.technologies,
      demo_url: project.demo_url ?? "",
      repository_url: project.repository_url ?? "",
      is_published: !project.is_published,
      featured_order: project.featured_order,
    });
    setPending(false);
    if (!result.ok) {
      toast.error("Visibility not changed", { description: result.error });
      return;
    }
    toast.success(project.is_published ? "Project hidden" : "Project published");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/projects/${project.id}/edit`}>Edit</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleVisibility} disabled={pending}>
        {project.is_published ? "Hide" : "Publish"}
      </Button>
      <ConfirmDialog
        title="Delete this project?"
        description={`“${project.title}” will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const result = await deleteProjectAction(project.id);
          if (!result.ok) {
            toast.error("Delete failed", { description: result.error });
            return;
          }
          toast.success("Project deleted");
          router.refresh();
        }}
        trigger={
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10 hover:text-danger">
            Delete
          </Button>
        }
      />
    </div>
  );
}
