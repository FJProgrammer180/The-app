import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-parts";
import { PostForm } from "@/components/admin/post-form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { getAdminPostById } from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit article" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  if (!UUID_PATTERN.test(id)) notFound();

  const result = await getAdminPostById(id);

  if (!result.ok) {
    return (
      <>
        <AdminPageHeader title="Article unavailable" />
        <Alert tone="error" title="The article could not be loaded">
          {result.error}
        </Alert>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/admin/posts">Back to articles</Link>
        </Button>
      </>
    );
  }

  if (!result.data) notFound();
  const post = result.data;

  return (
    <>
      <AdminPageHeader
        eyebrow={`Articles / ${post.status}`}
        title={post.title}
        description={`Editing /blog/${post.slug}. Changes are written to PostgreSQL on save.`}
        actions={
          <>
            {post.status === "published" ? (
              <Button asChild variant="subtle" size="sm">
                <Link href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                  View live ↗
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/posts">← All articles</Link>
            </Button>
          </>
        }
      />
      {saved === "1" ? (
        <Alert tone="success" title="Article created" className="mb-6">
          The draft has been stored. Publish it when you are ready for it to appear on the site.
        </Alert>
      ) : null}
      <PostForm post={post} />
    </>
  );
}
