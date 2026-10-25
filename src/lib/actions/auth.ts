"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth";
import { safeInternalPath } from "@/lib/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, firstErrorMessage } from "@/lib/validation";
import type { ActionResult } from "@/types";

export async function signInAction(input: {
  email: string;
  password: string;
  next?: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: input.email, password: input.password });
  if (!parsed.success) {
    return { ok: false, error: firstErrorMessage(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment, then restart the server.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Deliberately generic: never reveal whether an account exists.
    console.error("[auth] sign-in failed:", error?.message);
    return { ok: false, error: "Those credentials were not accepted." };
  }

  // Confirm the account is on the administrator allowlist before redirecting.
  const session = await getAdminSession();
  if (!session) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "This account is not an administrator for this site.",
    };
  }

  revalidatePath("/admin");
  redirect(safeInternalPath(input.next, "/admin"));
}

/** Clears the auth cookies server-side and invalidates the refresh token. */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
