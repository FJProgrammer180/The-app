import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";

import { markdownSanitizeSchema } from "@/lib/markdown";

/**
 * Safe markdown renderer.
 *
 * Order matters: GFM → sanitize → slug. Raw HTML is never enabled, so injected
 * markup cannot execute; sanitization then strips dangerous URLs/attributes and
 * heading ids are generated after sanitization by us.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className ?? "article-body"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema], rehypeSlug]}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = Boolean(href && /^https?:\/\//.test(href));
            return (
              <a
                href={href}
                {...props}
                {...(isExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            // eslint-disable-next-line @next/next/no-img-element -- article images may live on any https host
            return <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" {...props} />;
          },
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
