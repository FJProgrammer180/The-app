import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase auth session cookie on every matched request and gates
 * the /admin area. The allowlist check still happens server-side in the admin
 * layout and in every server action — this is an early exit, not the authority.
 */
export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  const response = NextResponse.next({ request });

  if (!config) {
    // Without Supabase there is no way to authenticate: send admins to the
    // login page which explains the missing configuration.
    if (request.nextUrl.pathname.startsWith("/admin") && request.nextUrl.pathname !== "/admin/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        const next = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          next.cookies.set(name, value, options);
        }
        Object.assign(response, next);
      },
    },
  });

  // Skip the auth round-trip entirely for anonymous visitors: no session cookie
  // means there is nothing to refresh, and public pages stay fast.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => /^sb-.*-auth-token/.test(cookie.name));

  const user = hasSessionCookie
    ? (await supabase.auth.getUser()).data.user
    : null;

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (pathname === "/admin/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
