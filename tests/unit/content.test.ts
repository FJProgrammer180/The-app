import { describe, expect, it } from "vitest";

import {
  deriveExcerpt,
  extractHeadings,
  formatBytes,
  formatDate,
  isValidSlug,
  parseListInput,
  readingTimeMinutes,
  safeExternalUrl,
  safeInternalPath,
  slugify,
  stripMarkdown,
  truncate,
} from "@/lib/content";

describe("slugify", () => {
  it("normalises accents, punctuation and spacing", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
    expect(slugify("  Multiple   spaces  ")).toBe("multiple-spaces");
    expect(slugify("3D hero — with em dash")).toBe("3d-hero-with-em-dash");
  });

  it("strips leading and trailing separators and caps the length", () => {
    expect(slugify("---already-dashed---")).toBe("already-dashed");
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
    expect(slugify("!!!")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts kebab-case and rejects unsafe variants", () => {
    expect(isValidSlug("valid-slug-2")).toBe(true);
    expect(isValidSlug("Invalid")).toBe(false);
    expect(isValidSlug("double--dash")).toBe(false);
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("with_underscore")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("reading time", () => {
  it("uses a floor of one minute and ignores code fences", () => {
    expect(readingTimeMinutes("short")).toBe(1);
    const fourHundredWords = Array.from({ length: 400 }, () => "word").join(" ");
    expect(readingTimeMinutes(fourHundredWords)).toBe(2);
    const longFence = `\`\`\`ts\n${Array.from({ length: 2000 }, () => "code").join(" ")}\n\`\`\``;
    expect(readingTimeMinutes(longFence)).toBe(1);
  });
});

describe("stripMarkdown / deriveExcerpt", () => {
  it("removes markdown syntax and collapses whitespace", () => {
    const markdown = "# Title\n\nSome **bold** and `code` and [a link](https://example.com).";
    expect(stripMarkdown(markdown)).toBe("Title Some bold and code and a link.");
    expect(deriveExcerpt(markdown).length).toBeLessThanOrEqual(181);
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const value = truncate("one two three four five", 12);
    expect(value.endsWith("…")).toBe(true);
    expect(value.length).toBeLessThanOrEqual(12);
  });
});

describe("extractHeadings", () => {
  it("collects h2/h3 in order and ignores fenced code", () => {
    const markdown = [
      "## First section",
      "body",
      "### Nested detail",
      "```md",
      "## Not a heading",
      "```",
      "## Second — section",
    ].join("\n");

    const headings = extractHeadings(markdown);
    expect(headings.map((heading) => heading.text)).toEqual([
      "First section",
      "Nested detail",
      "Second — section",
    ]);
    expect(headings[0]?.level).toBe(2);
    expect(headings[1]?.level).toBe(3);
    expect(headings[0]?.id).toBe("first-section");
  });

  it("suffixes duplicate headings so anchors stay unique", () => {
    const headings = extractHeadings("## Repeat\n\n## Repeat\n\n## Repeat");
    expect(headings.map((heading) => heading.id)).toEqual(["repeat", "repeat-2", "repeat-3"]);
  });
});

describe("URL safety", () => {
  it("only allows http(s) external URLs", () => {
    expect(safeExternalUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com/");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it("prevents open redirects for internal paths", () => {
    expect(safeInternalPath("/projects")).toBe("/projects");
    expect(safeInternalPath("//evil.example", "/")).toBe("/");
    expect(safeInternalPath("https://evil.example", "/")).toBe("/");
    expect(safeInternalPath(undefined, "/blog")).toBe("/blog");
  });
});

describe("formatting helpers", () => {
  it("formats dates and invalid input", () => {
    expect(formatDate("2026-02-03T10:00:00Z")).toBe("3 Feb 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(null)).toBe("—");
  });

  it("parses list inputs", () => {
    expect(parseListInput("react, three.js\n supabase ")).toEqual(["react", "three.js", "supabase"]);
  });
});

describe("hero motion bounds", () => {
  it("clamps pointer input to a controlled range", async () => {
    const { pointerToTarget, HERO_LIMITS } = await import("@/lib/hero-motion");
    const extreme = pointerToTarget(12, -8, 0);
    expect(Math.abs(extreme.rotationX)).toBeLessThanOrEqual(HERO_LIMITS.rotationStrength + 1e-9);
    expect(Math.abs(extreme.rotationY)).toBeLessThanOrEqual(HERO_LIMITS.rotationStrength + 1e-9);
    expect(Math.abs(extreme.offsetX)).toBeLessThanOrEqual(HERO_LIMITS.parallax + 1e-9);
  });

  it("never lets scroll push the artifact beyond its lift", async () => {
    const { pointerToTarget, HERO_LIMITS } = await import("@/lib/hero-motion");
    const raised = pointerToTarget(0, 0, 4);
    expect(raised.offsetY).toBeLessThanOrEqual(HERO_LIMITS.scrollLift + 1e-9);
  });

  it("damps towards the target without overshooting", async () => {
    const { damp } = await import("@/lib/hero-motion");
    let value = 0;
    for (let step = 0; step < 200; step += 1) {
      value = damp(value, 1, 4, 1 / 60);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(value).toBeGreaterThan(0.99);
    // Large frame gaps are clamped so a background tab cannot teleport the scene.
    expect(damp(0, 1, 4, 10)).toBeLessThan(0.2);
  });

  it("bounds scroll progress and scale", async () => {
    const { scrollProgressFor, scrollScale } = await import("@/lib/hero-motion");
    expect(scrollProgressFor(-50, 800)).toBe(0);
    expect(scrollProgressFor(400, 800)).toBe(0.5);
    expect(scrollProgressFor(5000, 800)).toBe(1);
    expect(scrollProgressFor(100, 0)).toBe(0);
    expect(scrollScale(0)).toBe(1);
    expect(scrollScale(1)).toBeCloseTo(0.84, 5);
  });
});
