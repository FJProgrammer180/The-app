import "server-only";

import { cache } from "react";

import { createPublicSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  aboutSettingsSchema,
  brandSettingsSchema,
  contactSettingsSchema,
  homeSettingsSchema,
  socialSettingsSchema,
  settingsFormSchema,
  type SettingsFormValues,
} from "@/lib/validation";
import type { SiteSettings } from "@/types";

/**
 * Copy used when the database is empty or unreachable. It is intentionally
 * generic — it never claims achievements or facts on the owner's behalf.
 */
export const defaultSettings: SiteSettings = {
  brand: { name: "NEXORA", tagline: "A personal digital universe" },
  home: {
    eyebrow: "Personal digital universe",
    headline: "Exploring ideas. Engineering possibilities.",
    intro:
      "I build thoughtful software at the intersection of engineering, design and applied AI. NEXORA is where the work, the experiments and the writing live.",
    primary_cta_label: "View projects",
    primary_cta_href: "/projects",
    secondary_cta_label: "Read the blog",
    secondary_cta_href: "/blog",
  },
  about: {
    display_name: "Site owner",
    role: "Software engineer",
    bio:
      "This biography is editable from the admin dashboard. Sign in as an administrator and open Settings to describe who you are, what you are learning and where you are going.",
    learning: [],
    goals: [],
    skills: [],
    timeline: [],
  },
  social: { github: "", x: "", linkedin: "", email: "" },
  contact: {
    heading: "Start a conversation",
    intro:
      "Have a project, an idea or a question? Send a message and it will be stored securely for the site owner to read.",
  },
};

export type SettingsLoadResult = {
  settings: SiteSettings;
  /** True when the values came from the database rather than the defaults. */
  fromDatabase: boolean;
  /** Explanation shown to administrators when reading settings failed. */
  error: string | null;
};

function pick<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown } }, raw: unknown, fallback: T): T {
  const parsed = schema.safeParse(raw);
  return parsed.success && parsed.data !== undefined ? (parsed.data as T) : fallback;
}

function mergeSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    brand: pick(brandSettingsSchema, map.get("brand"), defaultSettings.brand),
    home: pick(homeSettingsSchema, map.get("home"), defaultSettings.home),
    about: pick(aboutSettingsSchema, map.get("about"), defaultSettings.about),
    social: pick(socialSettingsSchema, map.get("social"), defaultSettings.social),
    contact: pick(contactSettingsSchema, map.get("contact"), defaultSettings.contact),
  };
}

async function loadSettings(): Promise<SettingsLoadResult> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return { settings: defaultSettings, fromDatabase: false, error: "Supabase is not configured." };
  }

  try {
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error) {
      return {
        settings: defaultSettings,
        fromDatabase: false,
        error: `Could not load site settings: ${error.message}`,
      };
    }
    if (!data || data.length === 0) {
      return { settings: defaultSettings, fromDatabase: false, error: null };
    }
    return { settings: mergeSettings(data), fromDatabase: true, error: null };
  } catch (cause) {
    return {
      settings: defaultSettings,
      fromDatabase: false,
      error: cause instanceof Error ? cause.message : "Network error while loading site settings.",
    };
  }
}

/** Request-scoped cache so a page renders settings once. */
export const getSiteSettings = cache(
  async (): Promise<SiteSettings> => {
    const result = await loadSettings();
    return result.settings;
  },
);

/** Admin-facing variant that also reports problems instead of hiding them. */
export async function getSiteSettingsWithStatus(): Promise<SettingsLoadResult> {
  return loadSettings();
}

/** Values for the admin settings form. Falls back to defaults per section. */
export async function getSettingsFormValues(): Promise<SettingsFormValues> {
  const supabase = await createSupabaseServerClient();
  let rows: { key: string; value: unknown }[] = [];
  if (supabase) {
    const { data } = await supabase.from("site_settings").select("key, value");
    rows = data ?? [];
  }
  const merged = mergeSettings(rows);
  return (
    settingsFormSchema.safeParse(merged).data ?? {
      ...merged,
      social: {
        github: merged.social.github || null,
        x: merged.social.x || null,
        linkedin: merged.social.linkedin || null,
        email: merged.social.email,
      },
    }
  );
}
