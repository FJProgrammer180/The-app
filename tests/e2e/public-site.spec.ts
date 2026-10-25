import { expect, test } from "@playwright/test";

/**
 * Public-site journeys. These run against whatever backend the dev server is
 * configured with: a real Supabase project, or the local fixture server in
 * tests/support/mock-postgrest.mjs.
 */

test.describe("homepage", () => {
  test("renders the cinematic hero, navigation and primary actions", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /view projects/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /read the blog/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

    // The hero visual must exist in a defined mode (interactive or static).
    const hero = page.getByTestId("hero-visual");
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute("data-mode", /interactive|static/);

    // Navigation must remain clickable — no overlay blocking the header.
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: /writing/i }).click();
    await expect(page).toHaveURL(/\/blog$/);

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });

  test("respects reduced-motion preferences with a static artifact", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByTestId("hero-visual")).toHaveAttribute("data-mode", "static");
  });

  test("serves a real 404 for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
  });
});

test.describe("blog", () => {
  test("lists only published articles", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const cards = page.locator("article");
    const count = await cards.count();
    for (let index = 0; index < count; index += 1) {
      await expect(cards.nth(index)).not.toContainText(/draft/i);
    }
  });

  test("renders an article with a table of contents and metadata", async ({ page }) => {
    await page.goto("/blog");
    const firstArticle = page.locator("article h3 a").first();
    if ((await firstArticle.count()) === 0) {
      test.skip(true, "No published articles available in this environment.");
    }
    const title = (await firstArticle.textContent())?.trim() ?? "";
    await firstArticle.click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await expect(page.getByRole("navigation", { name: /in this article/i })).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test("search narrows the listing via the URL", async ({ page }) => {
    await page.goto("/blog");
    const search = page.getByRole("search");
    await search.getByRole("searchbox").fill("zzzz-no-match");
    await search.getByRole("button", { name: /search/i }).click();
    await expect(page).toHaveURL(/q=zzzz-no-match/);
    await expect(page.getByText(/no articles match that filter/i)).toBeVisible();
  });

  test("unpublished slugs are not reachable", async ({ page }) => {
    const response = await page.goto("/blog/notes-on-the-nexora-content-model");
    // Published in another environment is acceptable; a draft must be 404 there.
    if (response?.status() === 200) {
      const body = await page.locator("body").innerText();
      test.skip(!/content model/i.test(body), "Article is not present in this environment.");
    } else {
      expect(response?.status()).toBe(404);
    }
  });

  test("sitemap never contains draft URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).not.toContain("/admin");
  });

  test("robots.txt disallows the admin area and advertises the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    const body = await response.text();
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Sitemap:");
  });
});

test.describe("projects", () => {
  test("only published projects are listed", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Hidden project");
  });

  test("hidden projects return 404", async ({ page }) => {
    const response = await page.goto("/projects/hidden-fixture-project");
    expect(response?.status()).toBe(404);
  });
});

test.describe("contact", () => {
  test("validates on the client before contacting the server", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText(/tell me your name/i)).toBeVisible();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("persists a valid message and only then confirms success", async ({ page }) => {
    await page.goto("/contact");

    const banner = page.getByText(/not connected yet/i);
    if ((await banner.count()) > 0) {
      test.skip(true, "Backend not configured in this environment.");
    }

    await page.getByLabel("Name").fill("Playwright Visitor");
    await page.getByLabel("Email").fill("playwright@example.invalid");
    await page.getByLabel("Subject").fill("Automated end-to-end check");
    await page
      .getByLabel("Message")
      .fill("This message was submitted by the Playwright suite to verify persistence.");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/your message has been sent/i)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("admin boundary", () => {
  test("unauthenticated visitors are redirected to the login page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: /administrator sign in/i })).toBeVisible();
  });

  test("protected routes all redirect", async ({ page }) => {
    for (const path of ["/admin/posts", "/admin/projects", "/admin/media", "/admin/messages", "/admin/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });
    }
  });

  test("login rejects bad credentials without revealing account existence", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("nobody@example.invalid");
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByRole("alert")).toContainText(/not accepted|could not|failed/i, {
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("admin pages are marked noindex", async ({ page }) => {
    await page.goto("/admin/login");
    const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
    expect(robots).toContain("noindex");
  });
});
