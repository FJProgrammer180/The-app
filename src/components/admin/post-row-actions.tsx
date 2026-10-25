"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deletePostAction, setPostStatusAction } from "@/lib/actions/posts";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Post } from "@/types";

export function PostRowActions({ post }: { post: Post }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const toggleStatus = async () => {
    setPending(true);
    const next = post.status === "published" ? "draft" : "published";
    const result = await setPostStatusAction(post.id, next);
    setPending(false);
    if (!result.ok) {
      toast.error("Status not changed", { description: result.error });
      return;
    }
    toast.success(next === "published" ? "Article published" : "Article unpublished");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/posts/${post.id}/edit`}>Edit</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleStatus} disabled={pending}>
        {post.status === "published" ? "Unpublish" : "Publish"}
      </Button>
      <ConfirmDialog
        title="Delete this article?"
        description={`“${post.title}” will be permanently removed from the database.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const result = await deletePostAction(post.id);
          if (!result.ok) {
            toast.error("Delete failed", { description: result.error });
            return;
          }
          toast.success("Article deleted");
          router.refresh();
        }}
        trigger={
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10 hover:text-danger">
            Delete
          </Button>
        }
      />
    </div>
  );
}
