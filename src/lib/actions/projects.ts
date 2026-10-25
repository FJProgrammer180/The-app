"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminForAction } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstErrorMessage, projectFormSchema, toFieldErrors } from "@/lib/validation";
import type { ActionResult } from "@/types";

function revalidateProjectSurfaces(slug?: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/projects/${slug}`);
}

export async function createProjectAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = projectFormSchema.safeParse(input);
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
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: values.title,
      slug: values.slug,
      summary: values.summary || null,
      description: values.description || null,
      cover_image_url: values.cover_image_url,
      technologies: values.technologies,
      demo_url: values.demo_url,
      repository_url: values.repository_url,
      is_published: values.is_published,
      featured_order: values.featured_order,
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("[projects] create failed:", error.message);
    if (error.code === "23505") {
      return { ok: false, error: "That slug is already in use.", fieldErrors: { slug: ["That slug is already in use."] } };
    }
    return { ok: false, error: `The project could not be saved: ${error.message}` };
  }

  revalidateProjectSurfaces(data.slug);
  redirect(`/admin/projects/${data.id}/edit?saved=1`);
}

export async function updateProjectAction(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = projectFormSchema.safeParse(input);
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
  const { data, error } = await supabase
    .from("projects")
    .update({
      title: values.title,
      slug: values.slug,
      summary: values.summary || null,
      description: values.description || null,
      cover_image_url: values.cover_image_url,
      technologies: values.technologies,
      demo_url: values.demo_url,
      repository_url: values.repository_url,
      is_published: values.is_published,
      featured_order: values.featured_order,
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    console.error("[projects] update failed:", error.message);
    if (error.code === "23505") {
      return { ok: false, error: "That slug is already in use.", fieldErrors: { slug: ["That slug is already in use."] } };
    }
    return { ok: false, error: `The project could not be updated: ${error.message}` };
  }

  revalidateProjectSurfaces(data.slug);
  return { ok: true, message: "Project saved." };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    console.error("[projects] delete failed:", error.message);
    return { ok: false, error: "The project could not be deleted." };
  }

  revalidateProjectSurfaces();
  return { ok: true, message: "Project deleted." };
}
