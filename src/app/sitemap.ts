import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/env";
import { listPublishedSlugs } from "@/lib/queries/posts";
import { listPublishedProjectSlugs } from "@/lib/queries/projects";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [postsResult, projectsResult] = await Promise.all([
    listPublishedSlugs(),
    listPublishedProjectSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/projects`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  // Only published rows are ever queried, so drafts can never leak here.
  const postRoutes: MetadataRoute.Sitemap = postsResult.ok
    ? postsResult.data.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }))
    : [];

  const projectRoutes: MetadataRoute.Sitemap = projectsResult.ok
    ? projectsResult.data.map((project) => ({
        url: `${SITE_URL}/projects/${project.slug}`,
        lastModified: project.updated_at ? new Date(project.updated_at) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
    : [];

  return [...staticRoutes, ...projectRoutes, ...postRoutes];
}
