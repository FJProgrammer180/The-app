import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";

import { Cover } from "@/components/site/cover";
import { Markdown } from "@/components/site/markdown";
import { PostCard } from "@/components/site/post-card";
import { TableOfContents } from "@/components/site/table-of-contents";
import { Alert } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  extractHeadings,
  formatDate,
  readingTimeLabel,
  safeExternalUrl,
} from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import {
  getPublishedPostBySlug,
  getRelatedPosts,
} from "@/lib/queries/posts";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * Request-scoped so metadata and the page share a single query. Resolving the
 * slug in generateMetadata also lets Next.js answer with a real 404 status
 * instead of a soft 404 from a streamed page.
 */
const loadPost = cache(async (slug: string) => getPublishedPostBySlug(slug));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPost(slug);
  if (!result.ok || !result.data) {
    // Unpublished, missing or unreadable: never expose a public, indexable page.
    if (result.ok) notFound();
    return { title: "Article unavailable", robots: { index: false, follow: false } };
  }

  const post = result.data;
  const description = post.seo_description || post.excerpt || undefined;
  const title = post.seo_title || post.title;
  const canonical = `/blog/${post.slug}`;
  const images = post.cover_image_url?.startsWith("https://")
    ? [{ url: post.cover_image_url, alt: post.title }]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      tags: post.tags,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((image) => image.url),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [result, settings] = await Promise.all([loadPost(slug), getSiteSettings()]);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-36 sm:px-8">
        <Alert tone="error" title="This article could not be loaded">
          {result.code === "not_configured"
            ? "Supabase is not configured, so articles cannot be read."
            : "The content database did not respond. Please retry in a moment."}
        </Alert>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/blog">Back to the library</Link>
        </Button>
      </div>
    );
  }

  const post = result.data;
  if (!post) notFound();

  const headings = extractHeadings(post.content_md);
  const relatedResult = await getRelatedPosts(post, 3);
  const related = relatedResult.ok ? relatedResult.data.slice(0, 3) : [];
  const canonical = `${SITE_URL}/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: settings.about.display_name },
    publisher: { "@type": "Organization", name: settings.brand.name },
    mainEntityOfPage: canonical,
    image: safeExternalUrl(post.cover_image_url) ?? undefined,
    keywords: post.tags.join(", "),
  };

  return (
    <article>
      <script
        type="application/ld+json"
        // Serialised from database fields only; < is escaped to prevent HTML breakout.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="relative border-b border-line/70 pb-12 pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              href="/blog"
              className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-accent"
            >
              ← Writing
            </Link>
          </nav>

          <h1 className="text-title font-semibold text-foreground">{post.title}</h1>

          {post.excerpt ? (
            <p className="mt-5 text-[1.05rem] leading-relaxed text-muted">{post.excerpt}</p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full border border-line bg-surface text-[0.6rem] font-medium uppercase text-accent">
                {settings.about.display_name.slice(0, 1)}
              </span>
              {settings.about.display_name}
            </span>
            <span aria-hidden className="text-line-strong">|</span>
            <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
            <span aria-hidden className="text-line-strong">|</span>
            <span>{readingTimeLabel(post.content_md)}</span>
            {post.tags.length > 0 ? (
              <>
                <span aria-hidden className="text-line-strong">|</span>
                <ul className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        className="rounded-full border border-line px-2 py-0.5 text-[0.625rem] transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {post.cover_image_url ? (
        <div className="mx-auto mt-10 w-full max-w-5xl px-5 sm:px-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-surface">
            {safeExternalUrl(post.cover_image_url) || post.cover_image_url.startsWith("/") ? (
              <Image
                src={post.cover_image_url}
                alt={`Cover artwork for ${post.title}`}
                fill
                priority
                sizes="(min-width: 1024px) 960px, 100vw"
                className="object-cover"
              />
            ) : (
              <Cover src={null} alt="" label="Cover" className="size-full" />
            )}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-5xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <Markdown content={post.content_md} />

          <footer className="mt-16 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Written by {settings.about.display_name}</p>
              <p className="mt-1 text-xs text-muted">
                {settings.about.role || "Building on the web"} · {settings.brand.name}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/blog">More articles</Link>
            </Button>
          </footer>
        </div>

        <aside className="order-first space-y-6 lg:order-last lg:sticky lg:top-24 lg:self-start">
          <TableOfContents headings={headings} />
          <div className="rounded-lg border border-line bg-surface/40 p-5">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-soft">
              Canonical URL
            </p>
            <p className="mt-2 break-all text-xs text-muted">{canonical}</p>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="border-t border-line/70 py-16" aria-labelledby="related-heading">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <h2 id="related-heading" className="text-heading font-semibold text-foreground">
              Related reading
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => (
                <PostCard key={entry.id} post={entry} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
