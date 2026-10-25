"use server";

import { revalidatePath } from "next/cache";

import { requireAdminForAction } from "@/lib/auth";
import { SUPABASE_MEDIA_BUCKET } from "@/lib/env";
import { buildMediaPath } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mediaUploadSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

/**
 * Issues an upload target for an approved file. The browser uploads straight to
 * Storage, where the `media_admin_insert` policy independently enforces that
 * only administrators may write.
 */
export async function registerMediaUploadAction(input: {
  name: string;
  size: number;
  type: string;
}): Promise<ActionResult<{ path: string; publicUrl: string }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = mediaUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That file is not supported." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { path } = buildMediaPath(parsed.data.name);
  const { data } = supabase.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(path);
  return { ok: true, data: { path, publicUrl: data.publicUrl } };
}

export async function deleteMediaAction(path: string): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.storage.from(SUPABASE_MEDIA_BUCKET).remove([path]);
  if (error) {
    console.error("[media] delete failed:", error.message);
    return { ok: false, error: "The file could not be deleted." };
  }

  revalidatePath("/admin/media");
  return { ok: true, message: "File deleted." };
}
