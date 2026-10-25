import { z } from "zod";

import { isValidSlug, slugify } from "@/lib/content";

/**
 * Accepts an absolute http(s) URL, or an on-site path (e.g. /media/hero.webp).
 * Empty input becomes null so optional media fields stay clean.
 */
export const mediaUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => {
      if (value === null) return true;
      if (value.startsWith("/")) return !value.startsWith("//");
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter an https:// URL or an on-site path starting with /" },
  );

export const requiredMediaUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => {
      if (value === null) return true;
      if (value.startsWith("/")) return !value.startsWith("//");
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter an https:// URL or an on-site path starting with /" },
  );

export const externalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter a full http(s):// URL" },
  );

export const slugSchema = z
  .string()
  .trim()
  .min(1, "A slug is required")
  .max(80, "Keep the slug under 80 characters")
  .transform((value) => slugify(value))
  .refine((value) => isValidSlug(value), {
    message: "Use lowercase letters, numbers and single hyphens",
  });

export const tagsSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => {
    const list = Array.isArray(value) ? value : value.split(",");
    const cleaned = list
      .map((tag) => tag.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .map((tag) => tag.slice(0, 40));
    return Array.from(new Set(cleaned)).slice(0, 12);
  })
  .default([]);

export const postFormSchema = z.object({
  title: z.string().trim().min(3, "Give the article a title").max(200, "Keep titles under 200 characters"),
  slug: slugSchema,
  excerpt: z.string().trim().max(400, "Keep the excerpt under 400 characters").optional().default(""),
  content_md: z.string().min(1, "The article body cannot be empty").max(200_000, "That article is too long"),
  cover_image_url: mediaUrlSchema,
  hero_media_url: mediaUrlSchema,
  tags: tagsSchema,
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  seo_title: z.string().trim().max(70, "SEO titles are best under 70 characters").optional().default(""),
  seo_description: z
    .string()
    .trim()
    .max(320, "SEO descriptions are best under 320 characters")
    .optional()
    .default(""),
});

export type PostFormInput = z.input<typeof postFormSchema>;
export type PostFormValues = z.output<typeof postFormSchema>;

export const projectFormSchema = z.object({
  title: z.string().trim().min(2, "Give the project a title").max(200),
  slug: slugSchema,
  summary: z.string().trim().max(400).optional().default(""),
  description: z.string().max(40_000).optional().default(""),
  cover_image_url: mediaUrlSchema,
  technologies: tagsSchema,
  demo_url: externalUrlSchema,
  repository_url: externalUrlSchema,
  is_published: z.coerce.boolean().default(false),
  featured_order: z.coerce
    .number({ error: "Ordering must be a number" })
    .int("Ordering must be a whole number")
    .min(0, "Ordering cannot be negative")
    .max(9999)
    .default(0),
});

export type ProjectFormInput = z.input<typeof projectFormSchema>;
export type ProjectFormValues = z.output<typeof projectFormSchema>;

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell me your name")
    .max(120, "That name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  subject: z.string().trim().min(3, "Add a short subject").max(200, "Keep the subject under 200 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Add a little more detail (at least 10 characters)")
    .max(5000, "Keep messages under 5000 characters"),
  // Honeypot: real visitors never fill this hidden field.
  website: z.string().max(0, "Spam detected").optional().default(""),
});

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormValues = z.output<typeof contactFormSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Passwords are at least 8 characters"),
});

export const brandSettingsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120).default(""),
});

export const homeSettingsSchema = z.object({
  eyebrow: z.string().trim().max(80).default(""),
  headline: z.string().trim().min(1, "A headline is required").max(160),
  intro: z.string().trim().max(600).default(""),
  primary_cta_label: z.string().trim().max(40).default("View projects"),
  primary_cta_href: z
    .string()
    .trim()
    .refine((value) => value.startsWith("/") && !value.startsWith("//"), "Use an on-site path such as /projects")
    .default("/projects"),
  secondary_cta_label: z.string().trim().max(40).default("Read the blog"),
  secondary_cta_href: z
    .string()
    .trim()
    .refine((value) => value.startsWith("/") && !value.startsWith("//"), "Use an on-site path such as /blog")
    .default("/blog"),
});

export const aboutSettingsSchema = z.object({
  display_name: z.string().trim().min(1, "A display name is required").max(80),
  role: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(4000).default(""),
  learning: z.array(z.string().trim().max(120)).max(20).default([]),
  goals: z.array(z.string().trim().max(160)).max(20).default([]),
  skills: z.array(z.string().trim().max(60)).max(40).default([]),
  timeline: z
    .array(
      z.object({
        year: z.string().trim().max(20),
        title: z.string().trim().max(120),
        description: z.string().trim().max(400),
      }),
    )
    .max(20)
    .default([]),
});

export const socialSettingsSchema = z.object({
  github: externalUrlSchema,
  x: externalUrlSchema,
  linkedin: externalUrlSchema,
  email: z.string().trim().max(254).optional().default(""),
});

export const contactSettingsSchema = z.object({
  heading: z.string().trim().max(120).default("Start a conversation"),
  intro: z.string().trim().max(600).default(""),
});

export const settingsFormSchema = z.object({
  brand: brandSettingsSchema,
  home: homeSettingsSchema,
  about: aboutSettingsSchema,
  social: socialSettingsSchema,
  contact: contactSettingsSchema,
});

export type SettingsFormValues = z.output<typeof settingsFormSchema>;

export const mediaUploadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, "Files must be 10 MB or smaller"),
  type: z.string().refine(
    (value) =>
      [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
        "video/mp4",
        "video/webm",
      ].includes(value),
    { message: "Supported formats: JPG, PNG, WebP, AVIF, GIF, MP4, WebM" },
  ),
});

/** Flatten a ZodError into the shape used by server actions. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
