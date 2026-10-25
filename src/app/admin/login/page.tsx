import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
import { Alert } from "@/components/ui/primitives";
import { getSetupStatus, isSupabaseConfigured } from "@/lib/env";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const [settings, configured] = await Promise.all([getSiteSettings(), isSupabaseConfigured()]);
  const setup = getSetupStatus();

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_-10%,#0e2630_0%,#080a0f_60%)]" />
      <div className="hairline-grid absolute inset-0 -z-10 opacity-50" />

      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo name={settings.brand.name} />
          <Link
            href="/"
            className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-soft transition-colors hover:text-foreground"
          >
            ← Back to site
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-surface/70 p-7 shadow-2xl backdrop-blur-sm sm:p-8">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-accent/80">
            Restricted area
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Administrator sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Authentication is handled by Supabase Auth. Access is limited to accounts on the
            <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-[0.7rem]">admin_users</code>
            allowlist.
          </p>

          <div className="mt-7">
            {configured ? (
              <Suspense
                fallback={<div className="skeleton h-56 w-full rounded-md" aria-hidden />}
              >
                <LoginForm />
              </Suspense>
            ) : (
              <Alert tone="error" title="Supabase is not configured">
                Missing: {setup.missing.join(", ")}. Copy{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">.env.example</code> to{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">.env.local</code>, add
                your project credentials, and restart the dev server.
              </Alert>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2 text-xs leading-relaxed text-muted-soft">
          <p>
            No public registration exists. The first administrator is created in the Supabase
            dashboard and added to the allowlist — see{" "}
            <span className="text-muted">README → First administrator</span>.
          </p>
          <p>Sessions are server-verified on every admin request and server action.</p>
        </div>
      </div>
    </div>
  );
}
