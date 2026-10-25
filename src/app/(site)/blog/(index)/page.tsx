import Link from "next/link";
import type { Metadata } from "next";

import { Pagination } from "@/components/site/pagination";
import { PostCard } from "@/components/site/post-card";
import { SearchField } from "@/components/site/search-field";
import { Reveal } from "@/components/site/reveal";
import { PageHeader } from "@/components/site/page-header";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { listPublishedPosts } from "@/lib/queries/posts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; tag?: string; page?: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Writing",
    description:
      "Essays, engineering notes and experiments — published writing about building software and interactive experiences.",
    alternates: { canonical: "/blog" },
  };
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const search = params.q?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";

  const result = await listPublishedPosts({ page, search, tag });

  return (
    <>
      <PageHeader
        eyebrow="02 — Writing"
        title="Notes from the build."
        description="Long-form thinking on engineering, interface craft and applied AI. Every article here is published from the NEXORA dashboard."
        meta={
          result.ok ? (
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-soft">
              {result.data.total} {result.data.total === 1 ? "article" : "articles"}
              {search ? ` matching “${search}”` : ""}
              {tag ? ` tagged ${tag}` : ""}
            </p>
          ) : null
        }
      >
        <div className="mt-8">
          <SearchField action="/blog" defaultValue={search} hiddenParams={{ tag: tag || undefined }} />
        </div>
      </PageHeader>

      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        {!result.ok ? (
          <Alert tone="error" title="The library could not be loaded">
            {result.code === "not_configured"
              ? "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the server."
              : "The content database did not respond. Please retry in a moment."}
          </Alert>
        ) : (
          <>
            {result.data.tags.length > 0 ? (
              <div className="mb-10 flex flex-wrap items-center gap-2">
                <span className="mr-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-soft">
                  Topics
                </span>
                <Link
                  href={search ? `/blog?q=${encodeURIComponent(search)}` : "/blog"}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    tag === ""
                      ? "border-accent/45 bg-accent-soft/50 text-foreground"
                      : "border-line text-muted hover:border-line-strong hover:text-foreground",
                  )}
                >
                  All
                </Link>
                {result.data.tags.map((entry) => {
                  const link = new URLSearchParams();
                  if (search) link.set("q", search);
                  link.set("tag", entry);
                  return (
                    <Link
                      key={entry}
                      href={`/blog?${link.toString()}`}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        entry === tag
                          ? "border-accent/45 bg-accent-soft/50 text-foreground"
                          : "border-line text-muted hover:border-line-strong hover:text-foreground",
                      )}
                    >
                      {entry}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {result.data.posts.length === 0 ? (
              <EmptyState
                title={search || tag ? "No articles match that filter" : "No articles published yet"}
                description={
                  search || tag
                    ? "Try a different search term or clear the topic filter to see everything that has been published."
                    : "The library is empty. Articles appear here as soon as they are published from the admin dashboard."
                }
                action={
                  search || tag ? (
                    <Link href="/blog" className="text-sm text-accent underline underline-offset-4">
                      Clear filters
                    </Link>
                  ) : null
                }
              />
            ) : (
              <>
                <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" staggerChildren>
                  {result.data.posts.map((post, index) => (
                    <div key={post.id} data-reveal-item className="h-full">
                      <PostCard post={post} priority={index < 2} />
                    </div>
                  ))}
                </Reveal>
                <Pagination
                  basePath="/blog"
                  page={result.data.page}
                  pageCount={result.data.pageCount}
                  params={{ q: search || undefined, tag: tag || undefined }}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
