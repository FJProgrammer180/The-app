import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Authorization boundary tests.
 *
 * The Supabase server client is mocked so these tests assert the *policy* the
 * app enforces: a signed-in user is not an administrator unless a matching row
 * exists in admin_users, and every server action re-checks that.
 */

type FakeUser = { id: string; email: string } | null;
type FakeAdminRow = { user_id: string } | null;

let fakeUser: FakeUser = null;
let fakeAdminRow: FakeAdminRow = null;

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    return {
      auth: {
        getUser: async () => ({ data: { user: fakeUser }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({
          data: { user: fakeUser },
          error: fakeUser ? null : { message: "Invalid login credentials" },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: fakeAdminRow, error: null }),
          }),
        }),
      }),
    };
  },
  createPublicSupabaseClient: () => null,
  createSupabaseAdminClient: () => null,
}));

const { getAdminSession, requireAdmin, requireAdminForAction } = await import("@/lib/auth");

describe("getAdminSession", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    fakeUser = null;
    fakeAdminRow = null;
  });

  it("returns null when nobody is signed in", async () => {
    await expect(getAdminSession()).resolves.toBeNull();
  });

  it("returns null for a signed-in user missing from the allowlist", async () => {
    fakeUser = { id: "user-1", email: "user@example.com" };
    fakeAdminRow = null;
    await expect(getAdminSession()).resolves.toBeNull();
  });

  it("returns a session only for allowlisted accounts", async () => {
    fakeUser = { id: "admin-1", email: "admin@example.com" };
    fakeAdminRow = { user_id: "admin-1" };
    const session = await getAdminSession();
    expect(session?.user.id).toBe("admin-1");
    expect(session?.email).toBe("admin@example.com");
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    fakeUser = null;
    fakeAdminRow = null;
  });

  it("redirects anonymous visitors to the login page with a next path", async () => {
    await expect(requireAdmin("/admin/posts")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith(
      `/admin/login?next=${encodeURIComponent("/admin/posts")}`,
    );
  });

  it("redirects authenticated non-admins to the login page with an error", async () => {
    fakeUser = { id: "user-1", email: "user@example.com" };
    fakeAdminRow = null;

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin/login?error=not_authorized");
  });

  it("resolves for allowlisted administrators", async () => {
    fakeUser = { id: "admin-1", email: "admin@example.com" };
    fakeAdminRow = { user_id: "admin-1" };

    const session = await requireAdmin();
    expect(session.user.id).toBe("admin-1");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireAdminForAction", () => {
  beforeEach(() => {
    fakeUser = null;
    fakeAdminRow = null;
  });

  it("refuses mutations from anonymous callers", async () => {
    const result = await requireAdminForAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not authorized/i);
  });

  it("refuses mutations from signed-in non-admins", async () => {
    fakeUser = { id: "user-1", email: "user@example.com" };
    fakeAdminRow = null;
    const result = await requireAdminForAction();
    expect(result.ok).toBe(false);
  });

  it("allows mutations from allowlisted administrators", async () => {
    fakeUser = { id: "admin-1", email: "admin@example.com" };
    fakeAdminRow = { user_id: "admin-1" };
    const result = await requireAdminForAction();
    expect(result.ok).toBe(true);
  });
});
