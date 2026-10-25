import { defaultSchema } from "rehype-sanitize";

/**
 * Sanitization schema for article markdown.
 *
 * Raw HTML is never parsed (no rehype-raw), so `<script>` is inert before this
 * even runs. The schema still tightens the defaults: no inline styles, no
 * arbitrary attributes, no iframes and no data: URLs.
 */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    "a", "p", "br", "hr", "em", "strong", "del", "blockquote", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6", "code", "pre", "table", "thead", "tbody",
    "tr", "th", "td", "img", "sup", "sub", "input", // input: GFM task lists (disabled below)
  ],
  attributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    code: [["className", /^language-./]],
    th: ["align"],
    td: ["align"],
    input: [["type", "checkbox"], "checked", "disabled"],
    "*": ["id"],
  },
  protocols: {
    href: ["http", "https", "mailto", "#"],
    src: ["https"],
    longDesc: [],
  },
  clobberPrefix: "user-content-",
  strip: ["script", "style", "iframe", "object", "embed", "form", "link", "meta"],
};
