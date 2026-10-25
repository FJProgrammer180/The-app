"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Browser client used for Storage uploads and sign-out. Only the public anon
 * key is present in the bundle; RLS decides what the session may do.
 */
export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createBrowserClient<Database>(config.url, config.anonKey, {
    global: {
      fetch: (input, init) => {
        const timeout = AbortSignal.timeout(20_000);
        const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
        return fetch(input, { ...init, signal });
      },
    },
  });
}
