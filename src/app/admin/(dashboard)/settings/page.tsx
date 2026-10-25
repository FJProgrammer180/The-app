import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-parts";
import { SettingsForm } from "@/components/admin/settings-form";
import { Alert } from "@/components/ui/primitives";
import { getSetupStatus } from "@/lib/env";
import { getSettingsFormValues, getSiteSettingsWithStatus } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const [values, status] = await Promise.all([getSettingsFormValues(), getSiteSettingsWithStatus()]);
  const setup = getSetupStatus();

  return (
    <>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Site settings"
        description="Public copy, navigation branding and contact details. Changes publish immediately."
      />

      {!status.fromDatabase ? (
        <Alert tone="warning" title="Showing built-in defaults" className="mb-6">
          These values are not yet stored in the database
          {status.error ? ` (${status.error})` : ""}. Saving the form writes all sections to{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5">site_settings</code>.
        </Alert>
      ) : null}

      {!setup.configured ? (
        <Alert tone="error" title="Supabase is not configured" className="mb-6">
          Missing: {setup.missing.join(", ")}. Settings cannot be persisted until the environment is
          configured.
        </Alert>
      ) : null}

      <SettingsForm initialValues={values} />
    </>
  );
}
