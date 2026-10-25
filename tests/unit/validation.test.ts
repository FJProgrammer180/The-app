import { describe, expect, it } from "vitest";

import {
  contactFormSchema,
  postFormSchema,
  projectFormSchema,
  settingsFormSchema,
  slugSchema,
  tagsSchema,
  toFieldErrors,
} from "@/lib/validation";

const validPost = {
  title: "A workable article",
  slug: "A Workable Article",
  excerpt: "Short summary.",
  content_md: "## Heading\n\nBody copy.",
  cover_image_url: "",
  hero_media_url: "",
  tags: "engineering, Three.js",
  status: "draft",
  published_at: "",
  seo_title: "",
  seo_description: "",
};

describe("slugSchema", () => {
  it("normalises input into a valid slug", () => {
    const result = slugSchema.safeParse("Hello World / Part 2");
    expect(result.success).toBe(true);
    expect(result.data).toBe("hello-world-part-2");
  });

  it("rejects empty slugs", () => {
    expect(slugSchema.safeParse("   ").success).toBe(false);
  });
});

describe("tagsSchema", () => {
  it("accepts comma strings and de-duplicates", () => {
    const result = tagsSchema.safeParse(" react , react, Three.js ,, ");
    expect(result.success).toBe(true);
    expect(result.data).toEqual(["react", "Three.js"]);
  });

  it("caps the number of tags", () => {
    const result = tagsSchema.safeParse(Array.from({ length: 40 }, (_, index) => `tag-${index}`));
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(12);
  });
});

describe("postFormSchema", () => {
  it("accepts a valid draft and normalises optional fields to null", () => {
    const result = postFormSchema.safeParse(validPost);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.slug).toBe("a-workable-article");
    expect(result.data.cover_image_url).toBeNull();
    expect(result.data.seo_title).toBe("");
    expect(result.data.tags).toEqual(["engineering", "Three.js"]);
  });

  it("rejects an empty body", () => {
    const result = postFormSchema.safeParse({ ...validPost, content_md: "" });
    expect(result.success).toBe(false);
  });

  it("rejects unsafe media URLs", () => {
    for (const value of ["javascript:alert(1)", "//evil.example/x.png", "data:image/png;base64,xx"]) {
      const result = postFormSchema.safeParse({ ...validPost, cover_image_url: value });
      expect(result.success, value).toBe(false);
    }
  });

  it("accepts on-site media paths and https URLs", () => {
    expect(postFormSchema.safeParse({ ...validPost, cover_image_url: "/media/cover.jpg" }).success).toBe(true);
    expect(
      postFormSchema.safeParse({
        ...validPost,
        cover_image_url: "https://project.supabase.co/storage/v1/object/public/media/a.jpg",
      }).success,
    ).toBe(true);
  });

  it("reports field errors in a flat map", () => {
    const result = postFormSchema.safeParse({ ...validPost, title: "", slug: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toFieldErrors(result.error);
    expect(errors.title?.[0]).toBeTruthy();
    expect(errors.slug?.[0]).toBeTruthy();
  });
});

describe("projectFormSchema", () => {
  const validProject = {
    title: "NEXORA",
    slug: "nexora",
    summary: "A platform.",
    description: "## Detail",
    cover_image_url: "",
    technologies: "Next.js, Supabase",
    demo_url: "",
    repository_url: "",
    is_published: false,
    featured_order: 0,
  };

  it("accepts a valid project", () => {
    const result = projectFormSchema.safeParse(validProject);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.demo_url).toBeNull();
    expect(result.data.technologies).toEqual(["Next.js", "Supabase"]);
  });

  it("rejects invalid external URLs", () => {
    const result = projectFormSchema.safeParse({ ...validProject, demo_url: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });

  it("coerces ordering and rejects negatives", () => {
    const parsed = projectFormSchema.safeParse({ ...validProject, featured_order: "3" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.featured_order).toBe(3);
    expect(projectFormSchema.safeParse({ ...validProject, featured_order: -2 }).success).toBe(false);
  });
});

describe("contactFormSchema", () => {
  const validMessage = {
    name: "Alex Example",
    email: "ALEX@example.com",
    subject: "A project idea",
    message: "This message is long enough to pass validation.",
    website: "",
  };

  it("lowercases the email and accepts a valid submission", () => {
    const result = contactFormSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("alex@example.com");
  });

  it("rejects short messages and bad emails", () => {
    expect(contactFormSchema.safeParse({ ...validMessage, message: "hi" }).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...validMessage, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(contactFormSchema.safeParse({ ...validMessage, website: "http://spam" }).success).toBe(false);
  });
});

describe("settingsFormSchema", () => {
  const validSettings = {
    brand: { name: "NEXORA", tagline: "A personal digital universe" },
    home: {
      eyebrow: "Personal",
      headline: "Exploring ideas.",
      intro: "Intro copy.",
      primary_cta_label: "Projects",
      primary_cta_href: "/projects",
      secondary_cta_label: "Blog",
      secondary_cta_href: "/blog",
    },
    about: {
      display_name: "Site owner",
      role: "Engineer",
      bio: "Bio.",
      learning: ["Rust"],
      goals: ["Ship"],
      skills: ["TypeScript"],
      timeline: [{ year: "2026", title: "Built NEXORA", description: "Portfolio launch." }],
    },
    social: { github: "https://github.com/example", x: "", linkedin: "", email: "hi@example.com" },
    contact: { heading: "Hello", intro: "Say hi." },
  };

  it("accepts a complete payload", () => {
    const result = settingsFormSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.social.github).toBe("https://github.com/example");
  });

  it("rejects off-site call-to-action targets", () => {
    const result = settingsFormSchema.safeParse({
      ...validSettings,
      home: { ...validSettings.home, primary_cta_href: "https://evil.example" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsafe social URLs", () => {
    const result = settingsFormSchema.safeParse({
      ...validSettings,
      social: { ...validSettings.social, github: "javascript:alert(1)" },
    });
    expect(result.success).toBe(false);
  });
});
