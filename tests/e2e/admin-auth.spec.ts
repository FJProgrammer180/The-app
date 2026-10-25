import { expect, test } from "@playwright/test";

/**
 * Authenticated administrator journeys.
 *
 * These require a real Supabase project with:
 *   E2E_ADMIN_EMAIL    — an account that IS on the admin_users allowlist
 *   E2E_ADMIN_PASSWORD — its password
 *
 * Create that account through the Supabase dashboard (never in source), then:
 *   E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run test:e2e
 *
 * They are skipped (not silently passed) when the variables are absent.
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const hasCredentials = Boolean(email && password);

test.describe("administrator dashboard", () => {
  test.skip(!hasCredentials, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin flows.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  });

  test("overview reports live statistics", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /control room/i })).toBeVisible();
    await expect(page.getByText(/articles/i).first()).toBeVisible();
    await expect(page.getByText(/messages/i).first()).toBeVisible();
  });

  test("article lifecycle: create draft, publish, unpublish, delete", async ({ page }) => {
    const title = `Playwright draft ${Date.now()}`;

    await page.goto("/admin/posts/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Body").fill("## Automated check\n\nCreated by the Playwright suite.");
    await page.getByRole("button", { name: /save draft/i }).click();

    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+\/edit/, { timeout: 30_000 });
    await expect(page.getByText(/draft has been stored/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^publish$/i })).toBeVisible();

    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText(/article published/i).first()).toBeVisible({ timeout: 20_000 });

    // The published article must be reachable publicly before cleanup.
    const slug = await page.getByLabel("Slug").inputValue();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);

    await page.goto("/admin/posts");
    const row = page.getByRole("row", { name: new RegExp(title) });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: /unpublish/i }).click();
    await expect(page.getByText(/article unpublished/i).first()).toBeVisible({ timeout: 20_000 });

    // Unpublished again → the public page must 404.
    const response = await page.goto(`/blog/${slug}`);
    expect(response?.status()).toBe(404);

    await page.goto("/admin/posts");
    await page.getByRole("row", { name: new RegExp(title) }).getByRole("button", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByText(/article deleted/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("project creation and visibility toggle", async ({ page }) => {
    const title = `Playwright project ${Date.now()}`;

    await page.goto("/admin/projects/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Summary").fill("Created by the Playwright suite.");
    await page.getByLabel(/published/i).check();
    await page.getByRole("button", { name: /create project/i }).click();

    await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]+\/edit/, { timeout: 30_000 });

    await page.goto("/projects");
    await expect(page.getByText(title)).toBeVisible();

    await page.goto("/admin/projects");
    await page.getByRole("row", { name: new RegExp(title) }).getByRole("button", { name: /hide/i }).click();
    await expect(page.getByText(/project hidden/i).first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/projects");
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("settings persist to the public site", async ({ page }) => {
    const tagline = `Tagline ${Date.now()}`;

    await page.goto("/admin/settings");
    await page.getByLabel("Tagline").fill(tagline);
    await page.getByRole("button", { name: /save settings/i }).click();
    await expect(page.getByText(/settings saved/i).first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/");
    await expect(page.locator("footer")).toContainText(tagline);
  });

  test("sign out removes admin access", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/admin"), { timeout: 20_000 });

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("media page rejects an unsupported file type", async ({ page }) => {
    await page.goto("/admin/media");
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "malicious.html",
      mimeType: "text/html",
      buffer: Buffer.from("<script>alert(1)</script>"),
    });
    await expect(page.getByText(/supported formats/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
