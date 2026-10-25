"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireAdminForAction } from "@/lib/auth";
import { insertContactMessage } from "@/lib/queries/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contactFormSchema, firstErrorMessage, toFieldErrors } from "@/lib/validation";
import type { ActionResult } from "@/types";

/**
 * Public contact submission.
 *
 * Server-side validation is authoritative. A simple in-memory throttle limits
 * repeated submissions from one process; production deployments with multiple
 * instances should also add edge rate limiting (documented in the README).
 */
const attempts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const history = (attempts.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  history.push(now);
  attempts.set(key, history);
  if (attempts.size > 500) {
    for (const [entryKey, times] of attempts) {
      if (times.every((time) => now - time >= WINDOW_MS)) attempts.delete(entryKey);
    }
  }
  return history.length > MAX_ATTEMPTS;
}

async function resolveClientKey(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip");
    return ip ?? "anonymous";
  } catch {
    return "anonymous";
  }
}

export async function submitContactMessageAction(input: unknown): Promise<ActionResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: firstErrorMessage(parsed.error),
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const clientKey = await resolveClientKey();
  if (isRateLimited(clientKey)) {
    return {
      ok: false,
      error: "Too many messages from this session. Please try again in a minute.",
    };
  }

  const result = await insertContactMessage({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.code === "not_configured"
          ? "The contact form is not connected to a database yet. Please configure Supabase (see README)."
          : result.error,
    };
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true, message: "Message sent. Thank you — I will get back to you." };
}

export async function setMessageReadAction(id: string, isRead: boolean): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.from("contact_messages").update({ is_read: isRead }).eq("id", id);
  if (error) {
    console.error("[messages] mark read failed:", error.message);
    return { ok: false, error: "The message could not be updated." };
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true, message: isRead ? "Marked as read." : "Marked as unread." };
}

export async function deleteMessageAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) {
    console.error("[messages] delete failed:", error.message);
    return { ok: false, error: "The message could not be deleted." };
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true, message: "Message deleted." };
}
