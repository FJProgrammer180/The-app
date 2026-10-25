import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Live Row Level Security checks against a real Supabase project.
 *
 * These tests are SKIPPED unless explicit test credentials are supplied:
 *
 *   SUPABASE_TEST_URL=https://<ref>.supabase.co \
 *   SUPABASE_TEST_ANON_KEY=<anon key> \
 *   npx vitest run tests/unit/supabase-live.test.ts
 *
 * They require outbound network access to your Supabase project. The same
 * policies were also verified directly in SQL during development; see the
 * "Verification" section of the README for the recorded results.
 */
const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const hasLiveProject = Boolean(url && anonKey);

describe.skipIf(!hasLiveProject)("live RLS boundaries (requires credentials)", () => {
  const client = createClient(url ?? "https://placeholder.supabase.co", anonKey ?? "placeholder", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("returns only published posts to an anonymous visitor", async () => {
    const { data, error } = await client.from("posts").select("id, status, published_at");
    expect(error).toBeNull();
    for (const row of data ?? []) {
      expect(row.status).toBe("published");
      expect(row.published_at).not.toBeNull();
    }
  });

  it("never exposes contact messages to an anonymous visitor", async () => {
    const { data, error } = await client.from("contact_messages").select("id");
    // RLS returns an empty set; a permission error is also acceptable proof.
    expect(data?.length ?? 0).toBe(0);
    expect(error === null || error.code !== undefined).toBe(true);
  });

  it("rejects anonymous writes to posts", async () => {
    const { error } = await client
      .from("posts")
      .insert({ title: "anon", slug: "anon-live-test", content_md: "x" });
    expect(error).not.toBeNull();
  });

  it("rejects anonymous writes to site settings", async () => {
    const { error } = await client
      .from("site_settings")
      .update({ value: { hacked: true } })
      .eq("key", "brand");
    expect(error).not.toBeNull();
  });

  it("accepts a valid contact submission but gives no read access", async () => {
    const { error } = await client.from("contact_messages").insert({
      id: crypto.randomUUID(),
      name: "Live check",
      email: "live-check@example.invalid",
      subject: "Automated verification",
      message: "Inserted by the live RLS test suite; safe to delete.",
    });
    expect(error).toBeNull();

    const readBack = await client.from("contact_messages").select("id");
    expect(readBack.data ?? []).toHaveLength(0);
  });
});

describe("live RLS suite status", () => {
  it("reports whether live credentials were provided", () => {
    if (!hasLiveProject) {
      expect(hasLiveProject).toBe(false);
      // Surfaced in the test output so a skipped run is never mistaken for a pass.
      console.warn(
        "[tests] Live Supabase tests skipped: set SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY to run them.",
      );
    } else {
      expect(hasLiveProject).toBe(true);
    }
  });
});
