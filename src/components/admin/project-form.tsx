"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/lib/actions/projects";
import { slugify } from "@/lib/content";
import { projectFormSchema } from "@/lib/validation";
import { Markdown } from "@/components/site/markdown";
import { Field, FormSection } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project } from "@/types";

type FormInput = z.input<typeof projectFormSchema>;
type FormOutput = z.output<typeof projectFormSchema>;

const FIELDS = [
  "title",
  "slug",
  "summary",
  "description",
  "cover_image_url",
  "technologies",
  "demo_url",
  "repository_url",
  "is_published",
  "featured_order",
] as const;

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const isEdit = Boolean(project);
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const defaults: FormInput = {
    title: project?.title ?? "",
    slug: project?.slug ?? "",
    summary: project?.summary ?? "",
    description: project?.description ?? "",
    cover_image_url: project?.cover_image_url ?? "",
    technologies: project?.technologies ?? [],
    demo_url: project?.demo_url ?? "",
    repository_url: project?.repository_url ?? "",
    is_published: project?.is_published ?? false,
    featured_order: project?.featured_order ?? 0,
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const title = watch("title");
  const description = watch("description") ?? "";

  React.useEffect(() => {
    if (slugTouched) return;
    setValue("slug", slugify(title ?? ""));
  }, [title, slugTouched, setValue]);

  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const onSubmit = async (values: FormOutput) => {
    setServerError(null);
    const result = isEdit
      ? await updateProjectAction(project!.id, values)
      : await createProjectAction(values);

    if (!result.ok) {
      setServerError(result.error);
      if (result.fieldErrors) {
        for (const field of FIELDS) {
          const message = result.fieldErrors[field]?.[0];
          if (message) setError(field, { type: "server", message });
        }
      }
      toast.error("Could not save the project", { description: result.error });
      return;
    }

    toast.success("Project saved");
    if (isEdit) {
      reset({
        ...values,
        cover_image_url: values.cover_image_url ?? "",
        demo_url: values.demo_url ?? "",
        repository_url: values.repository_url ?? "",
      });
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {serverError ? (
        <Alert tone="error" title="Save failed">
          {serverError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <FormSection title="Project" description="Shown on the public gallery and case-study page.">
            <Field label="Title" htmlFor="title" error={errors.title?.message} required>
              <Input id="title" placeholder="Project name" aria-invalid={Boolean(errors.title)} {...register("title")} />
            </Field>
            <Field label="Slug" htmlFor="slug" error={errors.slug?.message} hint="Used in /projects/…" required>
              <Input
                id="slug"
                placeholder="project-slug"
                aria-invalid={Boolean(errors.slug)}
                {...register("slug", { onChange: () => setSlugTouched(true) })}
              />
            </Field>
            <Field label="Summary" htmlFor="summary" error={errors.summary?.message} hint="Shown on cards">
              <Textarea id="summary" rows={3} className="min-h-20" placeholder="One or two sentences on what this is." {...register("summary")} />
            </Field>
          </FormSection>

          <FormSection title="Case study" description="Markdown. Use headings for the problem, approach and outcome.">
            <div className="space-y-3">
              <Label htmlFor="description">Description</Label>
              <Tabs defaultValue="write">
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    id="description"
                    rows={18}
                    className="min-h-[24rem] font-mono text-[0.82rem] leading-relaxed"
                    placeholder={"## The challenge\n\n...\n\n## Approach\n\n...\n\n## Outcome\n\n..."}
                    {...register("description")}
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="min-h-[24rem] rounded-md border border-line bg-background-soft p-5">
                    {description.trim() ? (
                      <Markdown content={description} className="article-body text-[0.95rem]" />
                    ) : (
                      <p className="text-sm text-muted-soft">Nothing to preview yet.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              {errors.description ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.description.message}
                </p>
              ) : null}
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Visibility">
            <label className="flex items-start gap-3 rounded-md border border-line bg-background/40 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[color:var(--color-accent)]"
                {...register("is_published")}
              />
              <span>
                <span className="block font-medium text-foreground">Published</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  Visible on /projects when enabled.
                </span>
              </span>
            </label>
            <Field
              label="Featured order"
              htmlFor="featured_order"
              error={errors.featured_order?.message}
              hint="0 hides from the homepage feature row"
            >
              <Input id="featured_order" type="number" min={0} max={9999} {...register("featured_order")} />
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </FormSection>

          <FormSection title="Links & media">
            <Field label="Demo URL" htmlFor="demo_url" error={errors.demo_url?.message} hint="https:// only">
              <Input id="demo_url" type="url" placeholder="https://example.com" {...register("demo_url")} />
            </Field>
            <Field label="Repository URL" htmlFor="repository_url" error={errors.repository_url?.message}>
              <Input id="repository_url" type="url" placeholder="https://github.com/…" {...register("repository_url")} />
            </Field>
            <Field label="Cover image URL" htmlFor="cover_image_url" error={errors.cover_image_url?.message}>
              <Input id="cover_image_url" placeholder="https://…" {...register("cover_image_url")} />
            </Field>
            <p className="text-[0.68rem] leading-relaxed text-muted-soft">
              Upload artwork in{" "}
              <Link href="/admin/media" target="_blank" className="text-accent underline underline-offset-2">
                Media
              </Link>{" "}
              and paste the public URL. Buttons only render for valid URLs.
            </p>
          </FormSection>

          <FormSection title="Technologies">
            <Field label="Stack" htmlFor="technologies" error={errors.technologies?.message} hint="comma separated">
              <Input
                id="technologies"
                defaultValue={(project?.technologies ?? []).join(", ")}
                placeholder="Next.js, TypeScript, Supabase"
                onChange={(event) =>
                  setValue(
                    "technologies",
                    event.target.value
                      .split(",")
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                    { shouldDirty: true },
                  )
                }
              />
            </Field>
          </FormSection>

          {isEdit ? (
            <div className="rounded-lg border border-danger/25 bg-danger/[0.04] p-5">
              <p className="text-sm font-medium text-foreground">Delete project</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Removes the project and its case-study page. This cannot be undone.
              </p>
              <ConfirmDialog
                title="Delete this project?"
                description={`“${project!.title}” and its case study will be permanently removed.`}
                confirmLabel="Delete project"
                destructive
                onConfirm={async () => {
                  const result = await deleteProjectAction(project!.id);
                  if (!result.ok) {
                    toast.error("Delete failed", { description: result.error });
                    return;
                  }
                  toast.success("Project deleted");
                  router.push("/admin/projects");
                  router.refresh();
                }}
                trigger={
                  <Button type="button" variant="danger" size="sm" className="mt-4">
                    Delete…
                  </Button>
                }
              />
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
