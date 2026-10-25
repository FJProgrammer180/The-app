/**
 * Environment handling.
 *
 * Public browser config and server-only secrets are kept strictly separate:
 *  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are inlined into
 *    the browser bundle by Next.js and are safe to expose (RLS protects data).
 *  - SUPABASE_SERVICE_ROLE_KEY is read lazily on the server only and is never
 *    referenced from a Client Component.
 */

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Returns public Supabase configuration, or null when the project has not been
 * configured yet. Callers must handle null by showing a setup message instead
 * of pretending the integration works.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/** Server-only. Never import this from a Client Component. */
export function getServiceRoleKey(): string | null {
  if (typeof window !== "undefined") {
    throw new Error("getServiceRoleKey must never run in the browser");
  }
  return readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

export const SITE_URL =
  readEnv("NEXT_PUBLIC_SITE_URL")?.replace(/\/$/, "") ?? "http://localhost:3000";

export const SUPABASE_MEDIA_BUCKET = "media";

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MiB, mirrors the bucket policy

export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
] as const;

export type SetupStatus = {
  configured: boolean;
  hasServiceRole: boolean;
  missing: string[];
};

/** Used by the admin + documentation surfaces to explain what is missing. */
export function getSetupStatus(): SetupStatus {
  const missing: string[] = [];
  if (!readEnv("NEXT_PUBLIC_SUPABASE_URL")) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const hasServiceRole = Boolean(readEnv("SUPABASE_SERVICE_ROLE_KEY"));
  return {
    configured: missing.length === 0,
    hasServiceRole,
    missing,
  };
}
