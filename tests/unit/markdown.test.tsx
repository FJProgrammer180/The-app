import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Markdown } from "@/components/site/markdown";

describe("safe markdown rendering", () => {
  it("renders standard and GitHub-flavoured markdown", () => {
    const { container } = render(
      <Markdown
        content={[
          "# Title",
          "",
          "## Section",
          "",
          "- item one",
          "- item two",
          "",
          "| a | b |",
          "| - | - |",
          "| 1 | 2 |",
          "",
          "- [x] done",
        ].join("\n")}
      />,
    );

    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelectorAll("li").length).toBeGreaterThanOrEqual(3);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it("never executes embedded HTML or script tags", () => {
    const { container } = render(
      <Markdown content={'Before\n\n<script>window.__pwned = true;</script>\n\n<img src=x onerror="alert(1)">\n\nAfter'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[onerror]")).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("strips dangerous link protocols", () => {
    const { container } = render(
      <Markdown content={"[click me](javascript:alert(1)) and [safe](https://example.com)"} />,
    );

    const anchors = Array.from(container.querySelectorAll("a"));
    const unsafe = anchors.find((anchor) => anchor.getAttribute("href")?.includes("javascript"));
    expect(unsafe).toBeUndefined();

    const safe = anchors.find((anchor) => anchor.textContent === "safe");
    expect(safe?.getAttribute("href")).toBe("https://example.com");
    expect(safe?.getAttribute("target")).toBe("_blank");
    expect(safe?.getAttribute("rel")).toContain("noopener");
  });

  it("keeps internal links in the same tab", () => {
    const { container } = render(<Markdown content={"[projects](/projects)"} />);
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("/projects");
    expect(anchor?.getAttribute("target")).toBeNull();
  });

  it("adds stable heading ids for the table of contents", () => {
    const { container } = render(<Markdown content={"## Damped motion\n\n### Cost control"} />);
    expect(container.querySelector("h2")?.id).toBe("damped-motion");
    expect(container.querySelector("h3")?.id).toBe("cost-control");
  });

  it("removes inline styles and event handlers", () => {
    const { container } = render(
      <Markdown content={'<div style="position:fixed" onclick="alert(1)">x</div>'} />,
    );
    expect(container.querySelector("div[style], div[onclick]")).toBeNull();
  });

  it("renders images with alt text and lazy loading", () => {
    const { container } = render(
      <Markdown content={"![A diagram](https://example.com/diagram.png)"} />,
    );
    const image = container.querySelector("img");
    expect(image?.getAttribute("alt")).toBe("A diagram");
    expect(image?.getAttribute("loading")).toBe("lazy");
  });

  it("exposes the article content to assistive technology", () => {
    render(<Markdown content={"## Accessible heading"} />);
    expect(screen.getByRole("heading", { level: 2, name: "Accessible heading" })).toBeTruthy();
  });
});
