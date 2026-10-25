import { describe, expect, it } from "vitest";

import { buildMediaPath, isVideoFileName, validateMediaFile, MAX_MEDIA_BYTES } from "@/lib/media";

describe("buildMediaPath", () => {
  it("creates a dated, slugified, unique path", () => {
    const now = new Date("2026-03-04T12:00:00Z");
    const first = buildMediaPath("My Cover Image.PNG", now);
    const second = buildMediaPath("My Cover Image.PNG", now);

    expect(first.path).toMatch(/^2026\/03\/my-cover-image-[0-9a-f]{8}\.png$/);
    expect(first.path).not.toBe(second.path);
  });

  it("neutralises traversal and unsafe characters", () => {
    const result = buildMediaPath("../../etc/passwd", new Date("2026-01-01T00:00:00Z"));
    expect(result.path).not.toContain("..");
    expect(result.path.startsWith("2026/01/")).toBe(true);
    expect(result.safeName).toMatch(/^[a-z0-9-]+\./);
  });

  it("falls back to a bin extension when none is present", () => {
    const result = buildMediaPath("no-extension", new Date("2026-01-01T00:00:00Z"));
    expect(result.path.endsWith(".bin")).toBe(true);
  });
});

describe("validateMediaFile", () => {
  it("accepts supported images and video", () => {
    expect(validateMediaFile({ name: "a.jpg", size: 1024, type: "image/jpeg" }).ok).toBe(true);
    expect(validateMediaFile({ name: "a.mp4", size: 1024, type: "video/mp4" }).ok).toBe(true);
  });

  it("rejects oversized, empty and unsupported files", () => {
    const tooBig = validateMediaFile({ name: "a.png", size: MAX_MEDIA_BYTES + 1, type: "image/png" });
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) expect(tooBig.error).toMatch(/10 MB/);

    expect(validateMediaFile({ name: "a.png", size: 0, type: "image/png" }).ok).toBe(false);
    expect(validateMediaFile({ name: "a.svg", size: 100, type: "image/svg+xml" }).ok).toBe(false);
    expect(validateMediaFile({ name: "a.html", size: 100, type: "text/html" }).ok).toBe(false);
  });
});

describe("isVideoFileName", () => {
  it("detects video extensions", () => {
    expect(isVideoFileName("hero.MP4")).toBe(true);
    expect(isVideoFileName("clip.webm")).toBe(true);
    expect(isVideoFileName("still.jpg")).toBe(false);
  });
});
