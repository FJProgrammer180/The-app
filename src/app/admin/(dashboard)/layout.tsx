import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { signOutAction } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { getMessageStats } from "@/lib/queries/messages";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — NEXORA admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side authorization: redirects unauthenticated visitors to the login
  // page and authenticated non-admins back to the login page with an error.
  const session = await requireAdmin();
  const [settings, messageStats] = await Promise.all([getSiteSettings(), getMessageStats()]);
  const unreadCount = messageStats.ok ? messageStats.data.unread : 0;

  return (
    <AdminShell
      brandName={settings.brand.name}
      email={session.email}
      unreadCount={unreadCount}
      signOut={signOutAction}
    >
      {children}
    </AdminShell>
  );
}
