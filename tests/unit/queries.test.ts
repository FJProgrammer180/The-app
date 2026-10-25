import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Query-layer tests using a recorded fake PostgREST builder. They verify that
 * public queries always constrain to published content and that failures are
 * surfaced as data (not thrown), so pages can render honest error states.
 */

type Recorded = { method: string; args: unknown[] };

let recorded: Recorded[] = [];
let response: { data: unknown; error: unknown; count?: number | null } = {
  data: [],
  error: null,
  count: 0,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select",
    "eq",
    "neq",
    "lte",
    "gt",
    "or",
    "contains",
    "overlaps",
    "order",
    "range",
    "limit",
    "insert",
    "update",
    "delete",
    "upsert",
  ];

  for (const method of chainMethods) {
    builder[method] = (...args: unknown[]) => {
      recorded.push({ method, args });
      return proxy;
    };
  }

  const proxy = new Proxy(builder, {
    get(target, property: string) {
      if (property === "then") {
        // Makes the builder awaitable, like a PostgREST query.
        return (resolve: (value: unknown) => void) => resolve(response);
      }
      if (property === "maybeSingle" || property === "single") {
        return async () => {
          recorded.push({ method: property, args: [] });
          return response;
        };
      }
      return target[property];
    },
  });

  return proxy;
}

const fakeClient = {
  from: (table: string) => {
    recorded.push({ method: "from", args: [table] });
    return makeBuilder();
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createPublicSupabaseClient: () => fakeClient,
  createSupabaseServerClient: async () => fakeClient,
  createSupabaseAdminClient: () => null,
}));

const posts = await import("@/lib/queries/posts");
const projects = await import("@/lib/queries/projects");
const messages = await import("@/lib/queries/messages");

function called(method: string) {
  return recorded.filter((entry) => entry.method === method);
}

describe("listPublishedPosts", () => {
  beforeEach(() => {
    recorded = [];
    response = { data: [], error: null, count: 0 };
  });

  it("only selects published posts", async () => {
    await posts.listPublishedPosts();
    expect(called("eq").some((entry) => entry.args[0] === "status" && entry.args[1] === "published")).toBe(true);
  });

  it("escapes commas in search terms to avoid breaking the or-filter", async () => {
    await posts.listPublishedPosts({ search: "a,b(c)" });
    const orCall = called("or")[0];
    expect(orCall).toBeTruthy();
    expect(String(orCall?.args[0])).not.toContain("(");
    expect(String(orCall?.args[0])).toContain("ilike");
  });

  it("applies tag filtering and pagination bounds", async () => {
    await posts.listPublishedPosts({ tag: "Three.js", page: 2, perPage: 6 });
    const containsArgs = called("contains")[0]?.args as unknown[] | undefined;
    expect((containsArgs?.[1] as string[] | undefined)?.[0]).toBe("Three.js");
    expect(called("range")[0]?.args).toEqual([6, 11]);
  });

  it("returns a query_failed result instead of throwing on database errors", async () => {
    response = { data: null, error: { message: "boom" }, count: null };
    const result = await posts.listPublishedPosts();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("query_failed");
      expect(result.error).toMatch(/could not be reached/i);
    }
  });
});

describe("getPublishedPostBySlug", () => {
  beforeEach(() => {
    recorded = [];
  });

  it("filters by slug and published status", async () => {
    response = { data: null, error: null };
    await posts.getPublishedPostBySlug("hello-world");
    expect(called("eq").some((entry) => entry.args[0] === "slug" && entry.args[1] === "hello-world")).toBe(true);
    expect(called("eq").some((entry) => entry.args[0] === "status" && entry.args[1] === "published")).toBe(true);
  });
});

describe("listPublishedSlugs", () => {
  it("never requests drafts for the sitemap", async () => {
    recorded = [];
    response = { data: [], error: null };
    await posts.listPublishedSlugs();
    expect(called("eq").some((entry) => entry.args[0] === "status" && entry.args[1] === "published")).toBe(true);
  });
});

describe("project queries", () => {
  beforeEach(() => {
    recorded = [];
    response = { data: [], error: null };
  });

  it("lists only visible projects ordered by featured position", async () => {
    await projects.listPublishedProjects();
    expect(called("eq").some((entry) => entry.args[0] === "is_published" && entry.args[1] === true)).toBe(true);
    expect(called("order")[0]?.args[0]).toBe("featured_order");
  });

  it("returns an explicit not_configured result when the client is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createPublicSupabaseClient: () => null,
      createSupabaseServerClient: async () => null,
      createSupabaseAdminClient: () => null,
    }));
    const freshProjects = await import("@/lib/queries/projects");
    const result = await freshProjects.listPublishedProjects();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
    vi.doUnmock("@/lib/supabase/server");
  });
});

describe("insertContactMessage", () => {
  beforeEach(() => {
    recorded = [];
    response = { data: null, error: null };
  });

  it("generates an id and avoids INSERT ... RETURNING", async () => {
    const result = await messages.insertContactMessage({
      name: "Alex",
      email: "alex@example.com",
      subject: "Hello",
      message: "A message long enough to be stored.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);

    // A returning clause would need a public SELECT policy on contact_messages.
    expect(called("select")).toHaveLength(0);
    expect(called("insert")).toHaveLength(1);
  });

  it("reports a friendly error when the insert is rejected", async () => {
    response = { data: null, error: { message: "row-level security" } };
    const result = await messages.insertContactMessage({
      name: "Alex",
      email: "alex@example.com",
      subject: "Hello",
      message: "A message long enough to be stored.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/could not be saved/i);
  });
});
