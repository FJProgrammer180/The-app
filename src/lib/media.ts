export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
] as const;

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

/**
 * Builds a collision-free storage path. The original name is reduced to a safe
 * slug so that uploads can never traverse directories or overwrite each other.
 */
export function buildMediaPath(
  fileName: string,
  now = new Date(),
): { path: string; safeName: string } {
  const dot = fileName.lastIndexOf(".");
  const extension =
    dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const safeBase =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "asset";
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const unique = globalThis.crypto.randomUUID().slice(0, 8);
  const safeName = `${safeBase}-${unique}.${extension}`;
  return { path: `${year}/${month}/${safeName}`, safeName };
}

export function isVideoFileName(name: string): boolean {
  return /\.(mp4|webm)$/i.test(name);
}

export function validateMediaFile(file: { name: string; size: number; type: string }):
  | { ok: true }
  | { ok: false; error: string } {
  if (file.size <= 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_MEDIA_BYTES) return { ok: false, error: "Files must be 10 MB or smaller." };
  if (!ALLOWED_MEDIA_TYPES.includes(file.type as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    return { ok: false, error: "Supported formats: JPG, PNG, WebP, AVIF, GIF, MP4, WebM." };
  }
  return { ok: true };
}
