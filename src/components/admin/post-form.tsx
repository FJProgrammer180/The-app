"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { deletePostAction, createPostAction, updatePostAction } from "@/lib/actions/posts";
import { Markdown } from "@/components/site/markdown";
import { slugify } from "@/lib/content";
import { postFormSchema } from "@/lib/validation";
import { Field, FormSection } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Post } from "@/types";

type FormInput = z.input<typeof postFormSchema>;
type FormOutput = z.output<typeof postFormSchema>;

const FIELDS = [
  "title",
  "slug",
  "excerpt",
  "content_md",
  "cover_image_url",
  "hero_media_url",
  "tags",
  "status",
  "published_at",
  "seo_title",
  "seo_description",
] as const;

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toIso(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const isEdit = Boolean(post);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [deleting, setDeleting] = React.useState(false);

  const defaults: FormInput = {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content_md: post?.content_md ?? "",
    cover_image_url: post?.cover_image_url ?? "",
    hero_media_url: post?.hero_media_url ?? "",
    tags: post?.tags ?? [],
    status: post?.status ?? "draft",
    published_at: toDateTimeLocal(post?.published_at ?? null),
    seo_title: post?.seo_title ?? "",
    seo_description: post?.seo_description ?? "",
  };

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(postFormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const title = watch("title");
  const content = watch("content_md") ?? "";
  const tagsValue = watch("tags");
  const tagsText = Array.isArray(tagsValue) ? tagsValue.join(", ") : (tagsValue ?? "");

  // Auto-derive the slug until the author edits it manually.
  React.useEffect(() => {
    if (slugTouched) return;
    setValue("slug", slugify(title ?? ""));
  }, [title, slugTouched, setValue]);

  // Unsaved-changes guard.
  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const submitWith = (status: "draft" | "published") => async (values: FormOutput) => {
    setServerError(null);
    const payload: FormOutput = {
      ...values,
      status,
      published_at:
        status === "published"
          ? toIso(values.published_at ?? null) ?? new Date().toISOString()
          : null,
    };

    const result = isEdit
      ? await updatePostAction(post!.id, payload)
      : await createPostAction(payload);

    if (!result.ok) {
      setServerError(result.error);
      if (result.fieldErrors) {
        for (const field of FIELDS) {
          const message = result.fieldErrors[field]?.[0];
          if (message) setError(field, { type: "server", message });
        }
      }
      toast.error("Could not save the article", { description: result.error });
      return;
    }

    toast.success(status === "published" ? "Article published" : "Draft saved");
    if (isEdit) {
      reset({
        ...payload,
        cover_image_url: payload.cover_image_url ?? "",
        hero_media_url: payload.hero_media_url ?? "",
        published_at: toDateTimeLocal(payload.published_at ?? null),
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

      {isDirty ? (
        <div className="flex items-center gap-2 rounded-md border border-[#fbbf24]/25 bg-[#fbbf24]/[0.06] px-4 py-2 text-xs text-[#fbbf24]">
          <span className="size-1.5 rounded-full bg-[#fbbf24]" aria-hidden />
          Unsaved changes
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit(submitWith("draft"))}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-6">
          <FormSection title="Content" description="Markdown with GitHub-flavoured extensions.">
            <Field label="Title" htmlFor="title" error={errors.title?.message} required>
              <Input
                id="title"
                placeholder="A clear, specific headline"
                aria-invalid={Boolean(errors.title)}
                {...register("title")}
              />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              error={errors.slug?.message}
              hint="Used in /blog/…"
              required
            >
              <Input
                id="slug"
                placeholder="article-slug"
                aria-invalid={Boolean(errors.slug)}
                {...register("slug", {
                  onChange: () => setSlugTouched(true),
                })}
              />
            </Field>

            <Field label="Excerpt" htmlFor="excerpt" error={errors.excerpt?.message}>
              <Textarea
                id="excerpt"
                rows={3}
                className="min-h-20"
                placeholder="One or two sentences shown on cards and in search results."
                {...register("excerpt")}
              />
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="content_md">Body</Label>
                <span className="text-[0.68rem] text-muted-soft">{content.length} characters</span>
              </div>
              <Tabs defaultValue="write">
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    id="content_md"
                    rows={20}
                    className="min-h-[26rem] font-mono text-[0.82rem] leading-relaxed"
                    placeholder={"## Section heading\n\nWrite in Markdown. Code fences, tables, task lists and links are supported."}
                    aria-invalid={Boolean(errors.content_md)}
                    {...register("content_md")}
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="min-h-[26rem] rounded-md border border-line bg-background-soft p-5">
                    {content.trim() ? (
                      <Markdown content={content} className="article-body text-[0.95rem]" />
                    ) : (
                      <p className="text-sm text-muted-soft">Nothing to preview yet.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              {errors.content_md ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.content_md.message}
                </p>
              ) : null}
              <p className="text-[0.68rem] text-muted-soft">
                Raw HTML is never rendered; all output is sanitized before display.
              </p>
            </div>
          </FormSection>

          <FormSection title="SEO" description="Optional overrides for search engines and social cards.">
            <Field label="SEO title" htmlFor="seo_title" error={errors.seo_title?.message} hint="≤ 70 chars">
              <Input id="seo_title" placeholder={title || "Defaults to the article title"} {...register("seo_title")} />
            </Field>
            <Field
              label="SEO description"
              htmlFor="seo_description"
              error={errors.seo_description?.message}
              hint="≤ 320 chars"
            >
              <Textarea
                id="seo_description"
                rows={3}
                className="min-h-20"
                placeholder="Defaults to the excerpt."
                {...register("seo_description")}
              />
            </Field>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Publishing">
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" {...register("status")}>
                <option value="draft">Draft — private</option>
                <option value="published">Published — public</option>
              </Select>
            </Field>

            <Field
              label="Publication date"
              htmlFor="published_at"
              error={errors.published_at?.message}
              hint="UTC on save"
            >
              <Input id="published_at" type="datetime-local" {...register("published_at")} />
            </Field>

            <div className="flex flex-col gap-2 pt-1">
              <Button type="button" onClick={handleSubmit(submitWith("published"))} disabled={isSubmitting}>
                {post?.status === "published" ? "Update published article" : "Publish"}
              </Button>
              <Button type="submit" variant="subtle" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save draft"}
              </Button>
              {post?.status === "published" ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={handleSubmit(submitWith("draft"))}
                >
                  Unpublish
                </Button>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="Media">
            <Field
              label="Cover image URL"
              htmlFor="cover_image_url"
              error={errors.cover_image_url?.message}
              hint="https:// or /path"
            >
              <Input id="cover_image_url" placeholder="https://…" {...register("cover_image_url")} />
            </Field>
            <Field
              label="Hero media URL"
              htmlFor="hero_media_url"
              error={errors.hero_media_url?.message}
              hint="optional video"
            >
              <Input id="hero_media_url" placeholder="https://… .mp4" {...register("hero_media_url")} />
            </Field>
            <p className="text-[0.68rem] leading-relaxed text-muted-soft">
              Upload files in{" "}
              <Link href="/admin/media" target="_blank" className="text-accent underline underline-offset-2">
                Media
              </Link>{" "}
              and paste the public URL here.
            </p>
          </FormSection>

          <FormSection title="Metadata">
            <Field label="Tags" htmlFor="tags" error={errors.tags?.message} hint="comma separated">
              <Input
                id="tags"
                defaultValue={tagsText}
                placeholder="engineering, three.js, supabase"
                onChange={(event) =>
                  setValue(
                    "tags",
                    event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                    { shouldDirty: true },
                  )
                }
              />
            </Field>
          </FormSection>

          {isEdit ? (
            <div className="rounded-lg border border-danger/25 bg-danger/[0.04] p-5">
              <p className="text-sm font-medium text-foreground">Delete article</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Permanently removes the row from PostgreSQL. This cannot be undone.
              </p>
              <ConfirmDialog
                title="Delete this article?"
                description={`“${post!.title}” will be permanently deleted. This action cannot be undone.`}
                confirmLabel="Delete article"
                destructive
                onConfirm={async () => {
                  setDeleting(true);
                  const result = await deletePostAction(post!.id);
                  setDeleting(false);
                  if (!result.ok) {
                    toast.error("Delete failed", { description: result.error });
                    return;
                  }
                  toast.success("Article deleted");
                  router.push("/admin/posts");
                  router.refresh();
                }}
                trigger={
                  <Button type="button" variant="danger" size="sm" className="mt-4" disabled={deleting}>
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
