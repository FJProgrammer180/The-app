import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminSession = {
  user: User;
  email: string;
};

/**
 * Resolves the current Supabase user and verifies that they are present in the
 * `admin_users` allowlist. The allowlist row is the only source of truth —
 * being signed in is not enough to administer the site.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // RLS lets an authenticated user select their own allowlist row only.
  const { data, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !data) return null;

  return { user, email: user.email ?? "administrator" };
}

/** Layout/page guard: unauthenticated → login, authenticated non-admin → denied. */
export async function requireAdmin(nextPath = "/admin"): Promise<AdminSession> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/admin/login?error=not_configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }

  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login?error=not_authorized");
  }

  return session;
}

/**
 * Server-action guard. Server actions are publicly reachable HTTP endpoints, so
 * each one re-verifies the allowlist instead of trusting the UI.
 */
export async function requireAdminForAction(): Promise<
  { ok: true; session: AdminSession } | { ok: false; error: string }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      error: "You are not authorized to perform this action. Sign in as an administrator.",
    };
  }
  return { ok: true, session };
}
