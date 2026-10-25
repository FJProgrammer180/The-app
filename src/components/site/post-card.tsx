import Link from "next/link";

import { Cover } from "@/components/site/cover";
import { formatDate, readingTimeLabel } from "@/lib/content";
import type { Post } from "@/types";

export function PostCard({ post, priority = false }: { post: Post; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface/40 transition-colors duration-300 hover:border-line-strong focus-within:border-accent/50">
      <Cover
        src={post.cover_image_url}
        alt={post.title}
        label="Article"
        priority={priority}
        className="aspect-[16/9] w-full"
      />
      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-soft">
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          <span aria-hidden>·</span>
          <span>{readingTimeLabel(post.content_md ?? "")}</span>
        </div>
        <h3 className="text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground">
          <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-accent">
            <span className="absolute inset-0" aria-hidden />
            {post.title}
          </Link>
        </h3>
        {post.excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>
        ) : null}
        {post.tags.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {post.tags.slice(0, 3).map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line bg-background/60 px-2 py-0.5 text-[0.625rem] text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
