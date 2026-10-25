import Link from "next/link";
import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-parts";
import { PostForm } from "@/components/admin/post-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New article" };

export default function NewPostPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Articles / New"
        title="Write a new article"
        description="Saved as a draft by default. Publishing sets the publication date and makes it public immediately."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/posts">← All articles</Link>
          </Button>
        }
      />
      <PostForm />
    </>
  );
}
