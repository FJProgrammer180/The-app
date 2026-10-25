import type { Tables } from "@/types/database";

export type Post = Tables<"posts">;
export type Project = Tables<"projects">;
export type ContactMessage = Tables<"contact_messages">;
export type SiteSetting = Tables<"site_settings">;

export type PostStatus = Post["status"];

export type PublicPostSummary = Pick<
  Post,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "cover_image_url"
  | "tags"
  | "published_at"
  | "created_at"
>;

export type ProjectSummary = Pick<
  Project,
  | "id"
  | "title"
  | "slug"
  | "summary"
  | "cover_image_url"
  | "technologies"
  | "demo_url"
  | "repository_url"
  | "featured_order"
  | "created_at"
>;

/** Discriminated result so pages can distinguish "empty" from "failed". */
export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "not_configured" | "query_failed" };

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type BrandSettings = {
  name: string;
  tagline: string;
};

export type HomeSettings = {
  eyebrow: string;
  headline: string;
  intro: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
};

export type TimelineEntry = {
  year: string;
  title: string;
  description: string;
};

export type AboutSettings = {
  display_name: string;
  role: string;
  bio: string;
  learning: string[];
  goals: string[];
  skills: string[];
  timeline: TimelineEntry[];
};

export type SocialSettings = {
  github: string;
  x: string;
  linkedin: string;
  email: string;
};

export type ContactSettings = {
  heading: string;
  intro: string;
};

export type SiteSettings = {
  brand: BrandSettings;
  home: HomeSettings;
  about: AboutSettings;
  social: SocialSettings;
  contact: ContactSettings;
};

export type MediaObject = {
  name: string;
  path: string;
  publicUrl: string;
  size: number | null;
  updatedAt: string | null;
  mimeType: string | null;
  isVideo: boolean;
};
