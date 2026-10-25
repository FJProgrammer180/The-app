"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminForAction } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstErrorMessage, postFormSchema, toFieldErrors } from "@/lib/validation";
import type { ActionResult } from "@/types";

function revalidatePostSurfaces(slug?: string) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/blog/${slug}`);
}

function normalise(input: unknown) {
  return postFormSchema.safeParse(input);
}

function isUniqueViolation(code: string | undefined) {
  return code === "23505";
}

export async function createPostAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = normalise(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: firstErrorMessage(parsed.error),
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const values = parsed.data;
  const publishedAt =
    values.status === "published" ? (values.published_at ?? new Date().toISOString()) : null;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt || null,
      content_md: values.content_md,
      cover_image_url: values.cover_image_url,
      hero_media_url: values.hero_media_url,
      tags: values.tags,
      status: values.status,
      published_at: publishedAt,
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("[posts] create failed:", error.message);
    if (isUniqueViolation(error.code)) {
      return { ok: false, error: "That slug is already in use.", fieldErrors: { slug: ["That slug is already in use."] } };
    }
    return { ok: false, error: `The article could not be saved: ${error.message}` };
  }

  revalidatePostSurfaces(data.slug);
  redirect(`/admin/posts/${data.id}/edit?saved=1`);
}

export async function updatePostAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = normalise(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: firstErrorMessage(parsed.error),
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data: existing } = await supabase
    .from("posts")
    .select("published_at, status")
    .eq("id", id)
    .maybeSingle();

  const values = parsed.data;
  const publishedAt =
    values.status === "published"
      ? (values.published_at ?? existing?.published_at ?? new Date().toISOString())
      : null;

  const { data, error } = await supabase
    .from("posts")
    .update({
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt || null,
      content_md: values.content_md,
      cover_image_url: values.cover_image_url,
      hero_media_url: values.hero_media_url,
      tags: values.tags,
      status: values.status,
      published_at: publishedAt,
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
    })
    .eq("id", id)
    .select("id, slug")
    .single();

  if (error) {
    console.error("[posts] update failed:", error.message);
    if (isUniqueViolation(error.code)) {
      return { ok: false, error: "That slug is already in use.", fieldErrors: { slug: ["That slug is already in use."] } };
    }
    return { ok: false, error: `The article could not be updated: ${error.message}` };
  }

  revalidatePostSurfaces(data.slug);
  return { ok: true, data: { id: data.id }, message: "Article saved." };
}

export async function setPostStatusAction(
  id: string,
  status: "draft" | "published",
): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const snapshots = await supabase.from("posts").select("slug, published_at").eq("id", id).maybeSingle();
  if (snapshots.error || !snapshots.data) {
    return { ok: false, error: "That article no longer exists." };
  }

  const { error } = await supabase
    .from("posts")
    .update({
      status,
      published_at:
        status === "published"
          ? (snapshots.data.published_at ?? new Date().toISOString())
          : null,
    })
    .eq("id", id);

  if (error) {
    console.error("[posts] status update failed:", error.message);
    return { ok: false, error: "The article status could not be changed." };
  }

  revalidatePostSurfaces(snapshots.data.slug);
  return { ok: true, message: status === "published" ? "Article published." : "Article moved to drafts." };
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) {
    console.error("[posts] delete failed:", error.message);
    return { ok: false, error: "The article could not be deleted." };
  }

  revalidatePostSurfaces();
  return { ok: true, message: "Article deleted." };
}
