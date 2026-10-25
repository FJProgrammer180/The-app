import "server-only";

import {
  createPublicSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { Project, QueryResult } from "@/types";

const PUBLIC_PROJECT_COLUMNS =
  "id, title, slug, summary, description, cover_image_url, technologies, demo_url, repository_url, is_published, featured_order, created_at, updated_at";

const FALLBACK_ERROR = "Projects could not be loaded right now. Please try again shortly.";

function failure<T>(error: unknown): QueryResult<T> {
  console.error("[projects] query failed:", error instanceof Error ? error.message : error);
  return { ok: false, error: FALLBACK_ERROR, code: "query_failed" };
}

export async function listPublishedProjects(options?: {
  featuredOnly?: boolean;
  limit?: number;
}): Promise<QueryResult<Project[]>> {
  const client = createPublicSupabaseClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    let query = client
      .from("projects")
      .select(PUBLIC_PROJECT_COLUMNS)
      .eq("is_published", true)
      .order("featured_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (options?.featuredOnly) query = query.gt("featured_order", 0);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) return failure(error);
    return { ok: true, data: (data ?? []) as Project[] };
  } catch (cause) {
    return failure(cause);
  }
}

export async function getPublishedProjectBySlug(slug: string): Promise<QueryResult<Project | null>> {
  const client = createPublicSupabaseClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const { data, error } = await client
      .from("projects")
      .select(PUBLIC_PROJECT_COLUMNS)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) return failure(error);
    return { ok: true, data: (data as Project | null) ?? null };
  } catch (cause) {
    return failure(cause);
  }
}

export async function listPublishedProjectSlugs(): Promise<
  QueryResult<{ slug: string; updated_at: string }[]>
> {
  const client = createPublicSupabaseClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const { data, error } = await client
      .from("projects")
      .select("slug, updated_at")
      .eq("is_published", true)
      .limit(500);
    if (error) return failure(error);
    return { ok: true, data: data ?? [] };
  } catch (cause) {
    return failure(cause);
  }
}

export async function listAdminProjects(): Promise<QueryResult<Project[]>> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const { data, error } = await client
      .from("projects")
      .select(PUBLIC_PROJECT_COLUMNS)
      .order("featured_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return failure(error);
    return { ok: true, data: (data ?? []) as Project[] };
  } catch (cause) {
    return failure(cause);
  }
}

export async function getAdminProjectById(id: string): Promise<QueryResult<Project | null>> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const { data, error } = await client.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) return failure(error);
    return { ok: true, data: (data as Project | null) ?? null };
  } catch (cause) {
    return failure(cause);
  }
}

export async function getProjectStats(): Promise<
  QueryResult<{ total: number; published: number; hidden: number }>
> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const [published, hidden] = await Promise.all([
      client.from("projects").select("id", { count: "exact", head: true }).eq("is_published", true),
      client.from("projects").select("id", { count: "exact", head: true }).eq("is_published", false),
    ]);
    if (published.error) return failure(published.error);
    if (hidden.error) return failure(hidden.error);
    const publishedCount = published.count ?? 0;
    const hiddenCount = hidden.count ?? 0;
    return {
      ok: true,
      data: { total: publishedCount + hiddenCount, published: publishedCount, hidden: hiddenCount },
    };
  } catch (cause) {
    return failure(cause);
  }
}
