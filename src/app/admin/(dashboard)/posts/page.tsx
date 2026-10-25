import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AdminPageHeader, AdminTableShell, StatusBadge } from "@/components/admin/page-parts";
import { PostRowActions } from "@/components/admin/post-row-actions";
import { Pagination } from "@/components/site/pagination";
import { SearchField } from "@/components/site/search-field";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/content";
import { listAdminPosts, type AdminPostFilters } from "@/lib/queries/posts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Articles" };

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
] as const;

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

export default async function AdminPostsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = (["all", "published", "draft"].includes(params.status ?? "")
    ? params.status
    : "all") as AdminPostFilters["status"];
  const search = params.q?.trim() ?? "";
  const page = Math.max(Number.parseInt(params.page ?? "1", 10) || 1, 1);

  const result = await listAdminPosts({ status, search, page });

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Articles"
        description="Drafts are invisible to visitors until published. Every change writes directly to PostgreSQL."
        actions={
          <Button asChild size="sm" variant="accent">
            <Link href="/admin/posts/new">
              <Plus className="size-3.5" aria-hidden /> New article
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface/60 p-1">
          {STATUS_FILTERS.map((filter) => {
            const query = new URLSearchParams();
            if (search) query.set("q", search);
            if (filter.value !== "all") query.set("status", filter.value);
            const href = query.size > 0 ? `/admin/posts?${query.toString()}` : "/admin/posts";
            return (
              <Link
                key={filter.value}
                href={href}
                aria-current={status === filter.value ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  status === filter.value
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <SearchField
          action="/admin/posts"
          defaultValue={search}
          placeholder="Search title or slug…"
          label="Search articles"
          hiddenParams={{ status: status === "all" ? undefined : status }}
        />
      </div>

      {!result.ok ? (
        <Alert tone="error" title="Articles could not be loaded">
          {result.error}
        </Alert>
      ) : result.data.posts.length === 0 ? (
        <EmptyState
          title={search || status !== "all" ? "No articles match that filter" : "No articles yet"}
          description={
            search || status !== "all"
              ? "Adjust the search or status filter to see more."
              : "Create your first article. It will stay private until you publish it."
          }
          action={
            <Button asChild size="sm" variant="subtle">
              <Link href="/admin/posts/new">Write an article</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminTableShell>
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Title", "Status", "Published", "Updated", ""].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-2.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-soft"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.posts.map((post) => (
                  <tr key={post.id} className="border-b border-line/60 last:border-0 hover:bg-surface/40">
                    <td className="max-w-[22rem] px-4 py-3">
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="block truncate font-medium text-foreground hover:text-accent"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-[0.62rem] text-muted-soft">
                        /blog/{post.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {post.published_at ? formatDateTime(post.published_at) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {formatDateTime(post.updated_at)}
                    </td>
                    <td className="px-2 py-2">
                      <PostRowActions post={post} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableShell>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-soft">
            <p>
              {result.data.total} {result.data.total === 1 ? "article" : "articles"} · page{" "}
              {result.data.page} of {result.data.pageCount}
            </p>
          </div>

          <Pagination
            basePath="/admin/posts"
            page={result.data.page}
            pageCount={result.data.pageCount}
            params={{ q: search || undefined, status: status === "all" ? undefined : status }}
          />
        </>
      )}
    </>
  );
}
