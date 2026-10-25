import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServiceRoleKey, getSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Fail fast instead of letting a page hang when the database is unreachable.
 * Supabase errors surface as normal query errors so the UI can show an
 * honest "content unavailable" state.
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

/**
 * Cookie-bound client used for anything that depends on the signed-in user.
 * Returns null when the environment is not configured so callers can render a
 * setup message rather than crashing.
 */
export async function createSupabaseServerClient(): Promise<TypedSupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render: the middleware refreshes the
          // session instead, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Stateless anonymous client for public content. No cookies are touched, so
 * public pages never depend on the visitor's session and RLS still guarantees
 * that only published rows are returned.
 */
export function createPublicSupabaseClient(): TypedSupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}

/**
 * Service-role client. Server only. Used exclusively for operations that cannot
 * be expressed through RLS (for example removing a user's storage folder or
 * reading auth admin data). Authorization must already have been verified by
 * the caller with `requireAdmin()`.
 */
export function createSupabaseAdminClient(): TypedSupabaseClient | null {
  const config = getSupabaseConfig();
  const serviceKey = getServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient<Database>(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}
