import "server-only";

import {
  createPublicSupabaseClient,
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/server";
import type { Post, QueryResult } from "@/types";

export const POSTS_PER_PAGE = 6;

const PUBLIC_POST_COLUMNS =
  "id, title, slug, excerpt, cover_image_url, tags, status, published_at, created_at, content_md, seo_title, seo_description, hero_media_url, updated_at";

const PUBLICATION_ERROR =
  "The library could not be reached. Please try again in a moment.";

function fail<T>(error: unknown, code: QueryResult<T> extends never ? never : "query_failed" | "not_configured" = "query_failed"): QueryResult<T> {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[posts] query failed:", message);
  return {
    ok: false,
    error: code === "not_configured" ? "Supabase is not configured yet." : PUBLICATION_ERROR,
    code,
  };
}

function clientOrFail<T>(): { client: TypedSupabaseClient } | { failure: QueryResult<T> } {
  const client = createPublicSupabaseClient();
  if (!client) {
    return {
      failure: {
        ok: false,
        error: "Supabase is not configured yet.",
        code: "not_configured",
      },
    };
  }
  return { client };
}

export type PublishedPostFilters = {
  search?: string;
  tag?: string;
  page?: number;
  perPage?: number;
};

export type PublishedPostList = {
  posts: Post[];
  total: number;
  page: number;
  pageCount: number;
  tags: string[];
};

/** Escapes characters that would break a PostgREST `or` filter. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`).replace(/[,()]/g, " ");
}

export async function listPublishedPosts(
  filters: PublishedPostFilters = {},
): Promise<QueryResult<PublishedPostList>> {
  const resolved = clientOrFail<PublishedPostList>();
  if ("failure" in resolved) return resolved.failure;
  const { client } = resolved;

  const perPage = Math.min(Math.max(filters.perPage ?? POSTS_PER_PAGE, 1), 24);
  const page = Math.max(filters.page ?? 1, 1);
  const search = filters.search?.trim() ?? "";
  const tag = filters.tag?.trim() ?? "";

  try {
    let query = client
      .from("posts")
      .select(PUBLIC_POST_COLUMNS, { count: "exact" })
      .eq("status", "published")
      .lte("published_at", new Date().toISOString());

    if (search) {
      const term = escapeLike(search);
      query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%,content_md.ilike.%${term}%`);
    }
    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const from = (page - 1) * perPage;
    const { data, error, count } = await query
      .order("published_at", { ascending: false })
      .range(from, from + perPage - 1);

    if (error) return fail(error);

    const tagRows = await client
      .from("posts")
      .select("tags")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString());

    const tags = Array.from(
      new Set((tagRows.data ?? []).flatMap((row) => row.tags ?? [])),
    ).sort((a, b) => a.localeCompare(b));

    const total = count ?? 0;
    return {
      ok: true,
      data: {
        posts: (data ?? []) as Post[],
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / perPage)),
        tags,
      },
    };
  } catch (cause) {
    return fail(cause);
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<QueryResult<Post | null>> {
  const resolved = clientOrFail<Post | null>();
  if ("failure" in resolved) return resolved.failure;
  const { client } = resolved;

  try {
    const { data, error } = await client
      .from("posts")
      .select(PUBLIC_POST_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();

    if (error) return fail(error);
    return { ok: true, data: (data as Post | null) ?? null };
  } catch (cause) {
    return fail(cause);
  }
}

export async function getRelatedPosts(
  post: Pick<Post, "id" | "tags">,
  limit = 3,
): Promise<QueryResult<Post[]>> {
  const resolved = clientOrFail<Post[]>();
  if ("failure" in resolved) return resolved.failure;
  const { client } = resolved;

  try {
    let query = client
      .from("posts")
      .select(PUBLIC_POST_COLUMNS)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .neq("id", post.id);

    if (post.tags.length > 0) {
      query = query.overlaps("tags", post.tags);
    }

    const { data, error } = await query
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) return fail(error);
    return { ok: true, data: (data ?? []) as Post[] };
  } catch (cause) {
    return fail(cause);
  }
}

export async function listPublishedSlugs(): Promise<QueryResult<{ slug: string; updated_at: string }[]>> {
  const resolved = clientOrFail<{ slug: string; updated_at: string }[]>();
  if ("failure" in resolved) return resolved.failure;
  const { client } = resolved;
  try {
    const { data, error } = await client
      .from("posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(500);
    if (error) return fail(error);
    return { ok: true, data: data ?? [] };
  } catch (cause) {
    return fail(cause);
  }
}

// ---------------------------------------------------------------------------
// Admin queries — cookie-bound so RLS returns drafts only for administrators.
// ---------------------------------------------------------------------------

export type AdminPostFilters = {
  search?: string;
  status?: "all" | "draft" | "published";
  page?: number;
  perPage?: number;
};

export async function listAdminPosts(
  filters: AdminPostFilters = {},
): Promise<QueryResult<{ posts: Post[]; total: number; page: number; pageCount: number }>> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }

  const perPage = Math.min(Math.max(filters.perPage ?? 10, 1), 50);
  const page = Math.max(filters.page ?? 1, 1);

  try {
    let query = client.from("posts").select("*", { count: "exact" });
    if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.search?.trim()) {
      const term = escapeLike(filters.search.trim());
      query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
    }
    const from = (page - 1) * perPage;
    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, from + perPage - 1);

    if (error) return fail(error);
    const total = count ?? 0;
    return {
      ok: true,
      data: {
        posts: (data ?? []) as Post[],
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  } catch (cause) {
    return fail(cause);
  }
}

export async function getAdminPostById(id: string): Promise<QueryResult<Post | null>> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const { data, error } = await client.from("posts").select("*").eq("id", id).maybeSingle();
    if (error) return fail(error);
    return { ok: true, data: (data as Post | null) ?? null };
  } catch (cause) {
    return fail(cause);
  }
}

export async function getPostStats(): Promise<
  QueryResult<{ total: number; published: number; drafts: number }>
> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const [published, drafts] = await Promise.all([
      client.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
      client.from("posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);
    if (published.error) return fail(published.error);
    if (drafts.error) return fail(drafts.error);
    const publishedCount = published.count ?? 0;
    const draftCount = drafts.count ?? 0;
    return {
      ok: true,
      data: { total: publishedCount + draftCount, published: publishedCount, drafts: draftCount },
    };
  } catch (cause) {
    return fail(cause);
  }
}

export async function getRecentAdminPosts(limit = 5): Promise<QueryResult<Post[]>> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const { data, error } = await client
      .from("posts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) return fail(error);
    return { ok: true, data: (data ?? []) as Post[] };
  } catch (cause) {
    return fail(cause);
  }
}
