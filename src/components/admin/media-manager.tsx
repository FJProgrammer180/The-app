"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Film, ImageIcon, Trash2, Upload } from "lucide-react";

import { deleteMediaAction, registerMediaUploadAction } from "@/lib/actions/media";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SUPABASE_MEDIA_BUCKET } from "@/lib/env";
import { formatBytes } from "@/lib/content";
import { validateMediaFile } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { MediaObject } from "@/types";

type UploadState = { fileName: string; status: "uploading" | "done" | "error"; message?: string };

export function MediaManager({
  initialMedia,
  configured,
}: {
  initialMedia: MediaObject[];
  configured: boolean;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [upload, setUpload] = React.useState<UploadState | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Supabase is not configured");
      return;
    }

    for (const file of Array.from(files)) {
      const validation = validateMediaFile({ name: file.name, size: file.size, type: file.type });
      if (!validation.ok) {
        setUpload({ fileName: file.name, status: "error", message: validation.error });
        toast.error("Upload rejected", { description: validation.error });
        continue;
      }

      setUpload({ fileName: file.name, status: "uploading" });

      const target = await registerMediaUploadAction({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      if (!target.ok || !target.data) {
        setUpload({ fileName: file.name, status: "error", message: target.ok ? "Unknown error" : target.error });
        toast.error("Upload rejected", { description: target.ok ? "Unknown error" : target.error });
        continue;
      }

      const { error } = await supabase.storage
        .from(SUPABASE_MEDIA_BUCKET)
        .upload(target.data.path, file, { contentType: file.type, upsert: false });

      if (error) {
        setUpload({ fileName: file.name, status: "error", message: error.message });
        toast.error("Upload failed", { description: error.message });
        continue;
      }

      setUpload({ fileName: file.name, status: "done" });
      toast.success("Upload complete", { description: `${file.name} is now in the media library.` });
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed p-8 text-center transition-colors",
          dragging ? "border-accent/60 bg-accent-soft/20" : "border-line-strong bg-surface/30",
        )}
      >
        <Upload className="mx-auto size-5 text-muted-soft" aria-hidden />
        <p className="mt-3 text-sm font-medium text-foreground">Drop files here</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
          JPG, PNG, WebP, AVIF, GIF, MP4 or WebM · 10 MB maximum. Uploads are written to the public
          Supabase Storage bucket by an authenticated administrator only.
        </p>
        <input
          ref={inputRef}
          id="media-upload"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm"
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <Button
          type="button"
          size="sm"
          variant="subtle"
          className="mt-5"
          disabled={!configured}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>

        {upload ? (
          <div
            role="status"
            className={cn(
              "mx-auto mt-5 max-w-md rounded-md border px-3 py-2 text-left text-xs",
              upload.status === "error"
                ? "border-danger/30 bg-danger/10 text-danger"
                : upload.status === "done"
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-line bg-surface text-muted",
            )}
          >
            <span className="font-mono uppercase tracking-[0.12em]">{upload.status}</span>{" "}
            · {upload.fileName}
            {upload.message ? <span className="block mt-1 opacity-80">{upload.message}</span> : null}
          </div>
        ) : null}
      </div>

      {!configured ? (
        <Alert tone="warning" title="Storage is unavailable">
          Supabase environment variables are missing, so uploads cannot be validated or stored.
        </Alert>
      ) : null}

      {initialMedia.length === 0 ? (
        <EmptyState
          title="The media library is empty"
          description="Upload artwork, covers or a licensed background video. Copy a public URL from here into a post, project or the homepage hero setting."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialMedia.map((item) => (
            <li
              key={item.path}
              className="group overflow-hidden rounded-lg border border-line bg-surface/40"
            >
              <div className="relative aspect-[16/10] bg-background">
                {item.isVideo ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_40%,#132c36,#080a0f)]">
                    <Film className="size-5 text-accent" aria-hidden />
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
                      Video
                    </span>
                  </div>
                ) : (
                  <Image
                    src={item.publicUrl}
                    alt={item.name}
                    fill
                    sizes="(min-width: 1024px) 320px, 50vw"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-xs text-foreground" title={item.name}>
                  {item.name}
                </p>
                <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-soft">
                  {item.mimeType?.startsWith("image") ? (
                    <ImageIcon className="size-3" aria-hidden />
                  ) : (
                    <Film className="size-3" aria-hidden />
                  )}
                  {formatBytes(item.size)}
                </p>
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(item.publicUrl);
                        toast.success("Public URL copied");
                      } catch {
                        toast.error("Could not copy the URL", { description: item.publicUrl });
                      }
                    }}
                  >
                    <Copy className="size-3.5" aria-hidden /> Copy URL
                  </Button>
                  <ConfirmDialog
                    title="Delete this file?"
                    description={`${item.name} will be removed from Storage. Pages that reference it will fall back to their designed placeholder.`}
                    confirmLabel="Delete file"
                    destructive
                    onConfirm={async () => {
                      const result = await deleteMediaAction(item.path);
                      if (!result.ok) {
                        toast.error("Delete failed", { description: result.error });
                        return;
                      }
                      toast.success("File deleted");
                      router.refresh();
                    }}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-2 text-danger hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" aria-hidden /> Delete
                      </Button>
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
