"use server";

import { revalidatePath } from "next/cache";

import { requireAdminForAction } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstErrorMessage, settingsFormSchema, toFieldErrors } from "@/lib/validation";
import type { ActionResult } from "@/types";

export async function updateSiteSettingsAction(input: unknown): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = settingsFormSchema.safeParse(input);
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
  const rows = [
    { key: "brand", value: values.brand },
    { key: "home", value: values.home },
    { key: "about", value: values.about },
    { key: "social", value: values.social },
    { key: "contact", value: values.contact },
  ].map((row) => ({ ...row, updated_at: new Date().toISOString() }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    console.error("[settings] update failed:", error.message);
    return { ok: false, error: `Settings could not be saved: ${error.message}` };
  }

  revalidatePath("/", "layout");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved and published." };
}
