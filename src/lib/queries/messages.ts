import "server-only";

import { createPublicSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContactMessage, QueryResult } from "@/types";

const FALLBACK_ERROR = "Messages could not be loaded right now.";

function failure<T>(error: unknown): QueryResult<T> {
  console.error("[messages] query failed:", error instanceof Error ? error.message : error);
  return { ok: false, error: FALLBACK_ERROR, code: "query_failed" };
}

export async function listAdminMessages(): Promise<QueryResult<ContactMessage[]>> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const { data, error } = await client
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return failure(error);
    return { ok: true, data: (data ?? []) as ContactMessage[] };
  } catch (cause) {
    return failure(cause);
  }
}

export async function getMessageStats(): Promise<
  QueryResult<{ total: number; unread: number; recent: ContactMessage[] }>
> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    const [total, unread, recent] = await Promise.all([
      client.from("contact_messages").select("id", { count: "exact", head: true }),
      client
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
      client
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    if (total.error) return failure(total.error);
    if (unread.error) return failure(unread.error);
    if (recent.error) return failure(recent.error);
    return {
      ok: true,
      data: {
        total: total.count ?? 0,
        unread: unread.count ?? 0,
        recent: (recent.data ?? []) as ContactMessage[],
      },
    };
  } catch (cause) {
    return failure(cause);
  }
}

/**
 * Inserts a validated contact message using the anonymous key. There is no
 * public read policy, so this call can only ever add a row.
 */
export async function insertContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<QueryResult<{ id: string }>> {
  const client = createPublicSupabaseClient();
  if (!client) {
    return { ok: false, error: "Supabase is not configured yet.", code: "not_configured" };
  }
  try {
    // The id is generated here on purpose: INSERT ... RETURNING would require a
    // public SELECT policy on contact_messages, which must never exist.
    const id = globalThis.crypto.randomUUID();
    const { error } = await client
      .from("contact_messages")
      .insert({ id, ...input, is_read: false });
    if (error) {
      console.error("[messages] insert failed:", error.message);
      return {
        ok: false,
        error: "Your message could not be saved. Please try again in a moment.",
        code: "query_failed",
      };
    }
    return { ok: true, data: { id } };
  } catch (cause) {
    console.error("[messages] insert threw:", cause instanceof Error ? cause.message : cause);
    return {
      ok: false,
      error: "Your message could not be saved. Please try again in a moment.",
      code: "query_failed",
    };
  }
}
