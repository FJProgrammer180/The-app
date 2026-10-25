import "server-only";

import { SUPABASE_MEDIA_BUCKET } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MediaObject, QueryResult } from "@/types";

const VIDEO_EXTENSIONS = [".mp4", ".webm"];

export function isVideoPath(path: string): boolean {
  const lower = path.toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * Lists the public media bucket. Storage policies allow public reads, but the
 * admin page uses the cookie client so the listing reflects the signed-in
 * administrator's permissions.
 */
export async function listMedia(): Promise<QueryResult<MediaObject[]>> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }

  try {
    const { data, error } = await client.storage
      .from(SUPABASE_MEDIA_BUCKET)
      .list("", { limit: 200, sortBy: { column: "updated_at", order: "desc" } });

    if (error) {
      console.error("[media] list failed:", error.message);
      return { ok: false, error: "Media could not be listed right now.", code: "query_failed" };
    }

    const entries = (data ?? []).filter((item) => item.name && item.id);
    const items: MediaObject[] = [];

    for (const entry of entries) {
      // Folders are returned with a null id in recent Storage versions.
      if (entry.id === null) continue;
      const path = entry.name;
      const { data: publicUrlData } = client.storage
        .from(SUPABASE_MEDIA_BUCKET)
        .getPublicUrl(path);
      const metadata = (entry.metadata ?? {}) as { size?: number; mimetype?: string };
      items.push({
        name: path,
        path,
        publicUrl: publicUrlData.publicUrl,
        size: typeof metadata.size === "number" ? metadata.size : null,
        updatedAt: entry.updated_at ?? null,
        mimeType: metadata.mimetype ?? null,
        isVideo: isVideoPath(path) || (metadata.mimetype ?? "").startsWith("video/"),
      });
    }

    return { ok: true, data: items };
  } catch (cause) {
    console.error("[media] list threw:", cause instanceof Error ? cause.message : cause);
    return { ok: false, error: "Media could not be listed right now.", code: "query_failed" };
  }
}
