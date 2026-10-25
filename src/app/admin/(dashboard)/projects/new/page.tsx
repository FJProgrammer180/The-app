import Link from "next/link";
import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-parts";
import { ProjectForm } from "@/components/admin/project-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Projects / New"
        title="Add a project"
        description="Projects stay hidden until you enable Published. External links are validated before they render."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/projects">← All projects</Link>
          </Button>
        }
      />
      <ProjectForm />
    </>
  );
}
