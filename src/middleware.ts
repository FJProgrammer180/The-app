import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on application routes only. Static assets and images are skipped so
     * the 3D hero and media are served without middleware overhead.
     */
    "/((?!_next/static|_next/image|favicon.ico|media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm|ico)$).*)",
  ],
};
