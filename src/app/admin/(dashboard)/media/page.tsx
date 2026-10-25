import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-parts";
import { MediaManager } from "@/components/admin/media-manager";
import { Alert } from "@/components/ui/primitives";
import { isSupabaseConfigured } from "@/lib/env";
import { listMedia } from "@/lib/queries/media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Media" };

export default async function AdminMediaPage() {
  const [result, configured] = await Promise.all([listMedia(), isSupabaseConfigured()]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Library"
        title="Media"
        description="Public Storage bucket used by post covers, project artwork and the homepage video."
      />

      <div className="mb-6 rounded-lg border border-line bg-surface/40 p-5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-soft">
          Homepage video workflow
        </p>
        <ol className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
          <li>1. Upload a licensed, compressed MP4 or WebM (≤ 10 MB) with this form.</li>
          <li>2. Copy its public URL.</li>
          <li>
            3. Set <code className="rounded bg-surface-2 px-1 py-0.5">NEXT_PUBLIC_HERO_VIDEO_URL</code> to
            that URL and restart the server — or place the file at{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5">public/media/hero.mp4</code> with a poster
            at <code className="rounded bg-surface-2 px-1 py-0.5">public/media/hero-poster.jpg</code>.
          </li>
          <li>4. The hero falls back to the designed background if the video is missing or blocked.</li>
        </ol>
      </div>

      {!result.ok ? (
        <Alert tone="error" title="Media could not be listed">
          {result.error}
        </Alert>
      ) : (
        <MediaManager initialMedia={result.data} configured={configured} />
      )}
    </>
  );
}
