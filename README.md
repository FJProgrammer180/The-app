# NEXORA

A personal portfolio and editorial platform: a cinematic landing page with an interactive
3D hero, a database-backed blog and project gallery, and an administrator dashboard that
publishes real content.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Three.js / React Three Fiber,
GSAP, and Supabase (PostgreSQL, Auth, Storage).

---

## Contents

1. [What is implemented](#1-what-is-implemented)
2. [Architecture](#2-architecture)
3. [Local development](#3-local-development)
4. [Supabase setup (step by step)](#4-supabase-setup-step-by-step)
5. [Creating the first administrator](#5-creating-the-first-administrator-securely)
6. [Database schema and security model](#6-database-schema-and-security-model)
7. [Media and asset workflow](#7-media-and-asset-workflow)
8. [Configuration reference](#8-configuration-reference)
9. [Testing and verification results](#9-testing-and-verification-results)
10. [Deployment](#10-deployment)
11. [Known limitations and remaining setup](#11-known-limitations-and-remaining-setup)
12. [Project structure](#12-project-structure)

---

## 1. What is implemented

**Public site**

| Route | Behaviour |
| --- | --- |
| `/` | Cinematic hero (video + procedural 3D artifact), featured projects, biography summary, recent articles, contact call to action. All copy comes from `site_settings`. |
| `/about` | Editable biography, learning interests, goals, skills and an optional timeline. Empty sections render honest empty states instead of invented achievements. |
| `/projects` | Database-backed gallery, ordered by `featured_order`. Only `is_published` rows are queried. |
| `/projects/[slug]` | Case study with markdown body, technology tags, and demo/source buttons that only render for valid `http(s)` URLs. Unpublished or unknown slugs return a real HTTP 404. |
| `/blog` | Published-only listing with server-side search (`?q=`), tag filtering (`?tag=`), pagination, cover art, reading time and empty/error states. |
| `/blog/[slug]` | Full article, table of contents generated from headings, related articles by shared tag, canonical + Open Graph + Twitter metadata, JSON-LD `BlogPosting`, sanitized markdown. Drafts return HTTP 404. |
| `/contact` | Server-validated contact form (Zod), honeypot, per-IP throttle, and a success message that only appears after the row is stored. |
| `/sitemap.xml`, `/robots.txt` | Published content only; `/admin` disallowed. |

**Administration** (`/admin`, Supabase Auth, allowlist enforced server-side)

- Overview with live counts (published/draft articles, visible/hidden projects, unread messages) and a setup checklist. No fabricated analytics.
- Articles: search, status filter, pagination, create/edit/delete, publish/unpublish, markdown editor with preview, slug auto-generation, SEO fields, unsaved-changes guard.
- Projects: full CRUD, ordering, visibility, validated external URLs.
- Media: Supabase Storage upload (type/size validated in the browser **and** on the server, unique safe paths), listing with copy-URL and delete, upload status/failure feedback.
- Messages: read/expand, mark read/unread, delete, reply link.
- Settings: brand, homepage hero, about, social links, contact copy — persisted to `site_settings` and reflected publicly immediately.

**Hardening**

- Every server action re-verifies the `admin_users` allowlist (`requireAdminForAction`), because server actions are public HTTP endpoints.
- Row Level Security is the authority: anon may read published rows only, insert contact messages only, and read settings; storage writes require `public.is_admin()`.
- Markdown is rendered through `react-markdown` + `remark-gfm` + `rehype-sanitize`; raw HTML is never parsed, and only `http/https/mailto/#` link protocols survive.
- Service-role key is read lazily on the server only and never referenced from a client component.
- 3D/WebGL, video and motion all degrade deliberately (see §7).

---

## 2. Architecture

```
Browser ─┬─ Server Components ──► lib/queries/* ──► Supabase PostgREST (anon key, RLS)
         │                                      └── RLS: published-only reads
         ├─ Server Actions ─────► lib/auth (requireAdminForAction) ──► PostgREST (user JWT, RLS)
         └─ Client Components ──► lib/supabase/browser (Storage uploads, auth session)
```

Design decisions worth knowing:

- **Reads and writes use the visitor's/administrator's own JWT**, never the service key. RLS is therefore enforced twice: once by the policy and once by the allowlist check.
- **Public content queries never touch cookies**, so public pages are not tied to a session and are cheap to render.
- **Middleware is an early exit, not the authority.** It refreshes the Supabase session cookie and bounces unauthenticated `/admin/*` requests; the admin layout and every action re-check the allowlist on the server.
- **The 3D stack is dynamically imported** and kept out of the initial HTML payload (`/` first-load JS ≈ 170 kB including framework chunks).
- **Query helpers return discriminated results** (`{ ok: true, data } | { ok: false, error, code }`) so pages can distinguish *empty* from *failed* — the site shows a designed empty state or an honest error banner rather than pretending everything is fine.

---

## 3. Local development

Requirements: Node.js 20+ (verified on Node 22), npm 10+.

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values (see §4)
npm run dev                    # http://localhost:3000
```

Without Supabase credentials the app still boots: public pages render with the built-in
default copy, the hero works, and content areas show "not configured" states instead of
failing. Add credentials to see real data.

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (binds `0.0.0.0` so previews work). |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + TypeScript). |
| `npm run typecheck` | `tsc --noEmit` with `strict` and `noUncheckedIndexedAccess`. |
| `npm test` | Vitest unit suite. |
| `npm run test:e2e` | Playwright suite (needs `npx playwright install chromium`). |
| `npm run verify` | typecheck → lint → unit tests → build. |

---

## 4. Supabase setup (step by step)

1. **Create a project** at [supabase.com](https://supabase.com) (any region). Save the database password somewhere safe.
2. **Copy the API values** from *Project Settings → API*:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only, never commit**)
3. **Apply the schema.** Either paste `supabase/migrations/20261025000000_init.sql` into the SQL editor, or use the CLI:

   ```bash
   npm i -g supabase
   supabase link --project-ref <your-project-ref>
   supabase db push          # applies supabase/migrations/*.sql
   ```

   The migration is idempotent and creates the tables, constraints, indexes, the
   `updated_at` triggers, the `is_admin()` helper, all RLS policies, the public
   `media` storage bucket and its policies, plus default site settings.
4. **Optional sample content** (describes this codebase, no invented achievements):

   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/seed.example.sql
   ```

   This inserts one project, two published articles and one draft. The draft exists so you
   can verify that unpublished content never appears publicly.

5. **Set the auth URL configuration** in *Authentication → URL Configuration*:
   - Site URL: your production origin (e.g. `https://nexora.example.com`)
   - Redirect URLs: `http://localhost:3000/**` for local work
6. **Disable public sign-ups** in *Authentication → Providers → Email* (turn off "Allow new
   users to sign up"). NEXORA has no registration route and, with sign-ups disabled, no one
   can create an account to attack the login form. Administrators are created by you (§5).

---

## 5. Creating the first administrator securely

There is no seeded admin, no default password and no registration form. The allowlist is
the only path in.

1. In the Supabase dashboard open **Authentication → Users → Add user → Create new user**.
   Enter the administrator email and a strong password (or send an invite). Confirm the
   email if confirmations are enabled.
2. Copy the new user's UUID from the users table.
3. Register that UUID in the allowlist. Run this in the **SQL editor** (the only place with
   the privileges required — no API role can insert into `admin_users`):

   ```sql
   insert into public.admin_users (user_id) values ('<user-uuid>');
   ```

4. Sign in at `/admin/login`. If the account is not on the allowlist, the action signs it
   out again and reports "This account is not an administrator for this site."

To revoke access:

```sql
delete from public.admin_users where user_id = '<user-uuid>';
delete from auth.users where id = '<user-uuid>';   -- optional: remove the account entirely
```

> Never place credentials in source, in `.env.example`, in commits, or in chat. The
> repository contains no administrator password.

---

## 6. Database schema and security model

`supabase/migrations/20261025000000_init.sql`

| Table | Purpose | Public access |
| --- | --- | --- |
| `admin_users` | Allowlist of `auth.users` ids that may administer the site. | None. Admins may read their own row. **No insert/update/delete policy exists for any API role.** |
| `posts` | Articles. `status ∈ {draft, published}`; a check constraint forces `published_at` when published. | `select` only where `status = 'published'` (RLS). Writes require `is_admin()`. |
| `projects` | Portfolio entries with `is_published`, `featured_order`, validated URL columns. | `select` only where `is_published`. Writes require `is_admin()`. |
| `contact_messages` | Contact submissions. | `insert` for anon with a shape check that also forces `is_read = false`. **No public `select`.** Admin-only read/update/delete. |
| `site_settings` | `key` → `jsonb` public copy. | Public `select` (needed to render copy). Writes require `is_admin()`. Never store secrets here. |

Supporting objects:

- `public.is_admin()` — `security definer` helper returning `exists (select 1 from admin_users where user_id = auth.uid())`, so policies can consult the allowlist without a recursive policy.
- `public.set_updated_at()` — `before update` trigger on `posts`, `projects`, `site_settings`.
- Indexes: `posts_published_listing_idx (status, published_at desc)`, `posts_tags_idx` (GIN), `projects_public_listing_idx (is_published, featured_order, created_at desc)`, `contact_messages_unread_idx` (partial), plus slug uniqueness from `unique` constraints.
- Storage bucket `media`: public read; `insert/update/delete` restricted to `bucket_id = 'media' and public.is_admin()`; 10 MiB limit and a MIME allowlist enforced by the bucket itself.

**Why the contact insert does not use `RETURNING`:** returning the row would require a
public `select` policy on `contact_messages`. The client generates the UUID instead
(`insertContactMessage`), so the insert policy can stay write-only.

---

## 7. Media and asset workflow

### Homepage background video

The hero never depends on a video being present:

1. `NEXT_PUBLIC_HERO_VIDEO_URL` (absolute URL) wins if set.
2. Otherwise `/public/media/hero.mp4` (or `hero.webm`) is used when the file exists.
3. Otherwise the designed gradient/grid ground renders. A broken `<video>` is never shown
   because the file is only mounted when it resolves, and `onError`/failed autoplay falls
   back to the poster.

To add your own licensed footage:

```bash
# compress to a reasonable size first (target < 8 MB, H.264 MP4 or VP9/AV1 WebM)
ffmpeg -i source.mov -vf scale=1920:-2 -an -c:v libx264 -crf 28 -preset slow -movflags +faststart public/media/hero.mp4
```

Then place a poster at `public/media/hero-poster.jpg` (a designed placeholder ships in the
repo) and optionally upload the same file through **Admin → Media** and put its public URL in
`NEXT_PUBLIC_HERO_VIDEO_URL`. The video is muted, looping, `playsInline`, `preload="metadata"`,
`aria-hidden`, `pointer-events-none`, overlaid with contrast scrims, and skipped entirely for
`prefers-reduced-motion`, Save-Data or 2G connections.

Do not hotlink unlicensed footage. Only use media you have the right to publish.

### 3D artifact

The hero uses a procedural Three.js scene (smoked-metal core, faceted shell, two orbital
rings, ~620-point particle halo, `Lightformer` studio environment) — no model download, no
HDR file. Pointer interaction is damped (`MathUtils`-style exponential damping in
`src/lib/hero-motion.ts`), bounded to ±0.32 rad rotation and ±0.14 world units of parallax,
and paused by an `IntersectionObserver` when the hero scrolls away.

Fallbacks: `prefers-reduced-motion`, viewports under 768 px, Save-Data/2G, missing WebGL, or
any runtime scene error all render the designed static artifact. An optional licensed `.glb`
can be supplied via `NEXT_PUBLIC_HERO_MODEL_URL`; if it fails to load the procedural scene is
used instead.

### Images and other media

Upload through **Admin → Media** (bucket `media`). Allowed: JPG, PNG, WebP, AVIF, GIF, MP4,
WebM up to 10 MB. Paths are generated as `YYYY/MM/<slug>-<random>.<ext>` so uploads can never
traverse directories or overwrite each other. Copy the public URL into a post cover, project
artwork, or the hero setting. `next/image` is configured to allow `https://*.supabase.co/storage/v1/object/public/**`.

---

## 8. Configuration reference

`.env.example` contains placeholders only:

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser | yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | yes | Anon/publishable key; RLS protects data. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | optional | Privileged maintenance only; never sent to the browser. |
| `NEXT_PUBLIC_SITE_URL` | browser | recommended | Canonical origin for metadata, sitemap and OG URLs. |
| `NEXT_PUBLIC_HERO_VIDEO_URL` | browser | optional | Absolute URL for the hero background video. |
| `NEXT_PUBLIC_HERO_MODEL_URL` | browser | optional | Licensed `.glb` artifact for the hero. |

`.env.local` is git-ignored. No secrets are committed to this repository.

---

## 9. Testing and verification results

Everything below was executed in this workspace. Where a check could not be executed, that
is stated explicitly.

### Commands actually run

| Command | Result |
| --- | --- |
| `npm install` | ✅ 686 packages installed, no peer-dependency errors. |
| `npx tsc --noEmit` | ✅ Passes (strict, `noUncheckedIndexedAccess`, `noUnusedLocals`). |
| `npx eslint .` | ✅ Passes with zero warnings/errors. |
| `npx vitest run` | ✅ **69 passed, 5 skipped** across 8 files (see below). |
| `npm run build` | ✅ Compiles; 22 routes; first-load JS 103 kB shared, `/` = 170 kB. |
| `npx playwright install chromium` | ❌ **Not run** — the browser CDN is unreachable from this sandbox (download fails). The Playwright suite is committed but has not been executed here. |

### Unit tests (`npm test`) — 69 passing

- `content.test.ts` — slug normalisation/validation, reading time, markdown stripping, excerpt truncation, heading extraction with unique anchors, URL safety (`javascript:`/`data:` rejected, open-redirect paths rejected), date/byte formatting, and hero motion bounds (pointer clamped, scroll lift capped, damping never overshoots, frame gaps clamped).
- `validation.test.ts` — every Zod schema: post/project/settings/contact, slug and tag coercion, unsafe media URLs, off-site CTA paths, honeypot, ordering coercion.
- `markdown.test.tsx` — GFM tables/task lists, `<script>`/`onerror` injection inert, `javascript:` links stripped, internal links not opened in a new tab, heading ids, inline styles/handlers removed, image alt/lazy attributes.
- `contact-form.test.tsx` — client validation blocks submission, success UI only after the action reports storage, server errors surfaced without a false success, `aria-invalid` set.
- `auth.test.ts` — signed-in-but-not-allowlisted → denied; anonymous → redirected with `?next=`; non-admin → `?error=not_authorized`; every server action guard refuses non-admins and allows allowlisted admins.
- `queries.test.ts` — public post queries always constrain `status = published`; search terms escaped; tag/pagination filters; failures returned as `query_failed`; contact insert generates its own id and issues no `RETURNING`.
- `media.test.ts` — storage paths are unique, slugified and traversal-safe; MIME/size validation.
- `supabase-live.test.ts` — live RLS suite; **5 skipped** unless `SUPABASE_TEST_URL` + `SUPABASE_TEST_ANON_KEY` are provided.

### Database verification (real Supabase project, executed via SQL)

The schema was applied to a live Supabase project and the policies were exercised by
switching Postgres roles. Results:

| Scenario | Result |
| --- | --- |
| `anon` selects `posts` | 2 rows returned, 0 drafts, future-dated post excluded |
| `anon` selects `projects` | 1 row (the hidden project invisible) |
| `anon` selects `contact_messages` | 0 rows (no public read policy) |
| `anon` selects `site_settings` | 5 rows |
| `anon` inserts a post | ❌ `42501 new row violates row-level security policy` |
| `anon` inserts a valid contact message | ✅ stored; still 0 rows readable afterwards |
| authenticated **non-admin** selects `posts` | 2 rows, 0 drafts, `is_admin() = false` |
| non-admin inserts a post / admin_users row | ❌ RLS violation |
| authenticated **admin** (allowlisted) | drafts visible; insert/update/publish succeeded |
| admin writes to `storage.objects` | ✅ allowed; non-admin write ❌ RLS violation |
| publish without `published_at` | ❌ `23514` check-constraint violation |
| temporary verification users/rows | removed afterwards (`admin_users`, `auth.users` now empty) |

### Rendering verification with a local PostgREST fixture

Because this sandbox cannot open TLS connections to `*.supabase.co` (verified: `curl` gets
`SSL_ERROR_SYSCALL` while npm/GitHub work), the UI was additionally exercised against
`tests/support/mock-postgrest.mjs`, a read-only PostgREST-compatible fixture serving the same
rows as the seed file. Observed with `next build && next start`:

| Check | Result |
| --- | --- |
| `/`, `/blog`, `/projects`, `/about`, `/contact`, `/sitemap.xml`, `/robots.txt` | 200 |
| Draft article `/blog/notes-on-the-nexora-content-model` | **404** |
| Future-dated published article | absent from `/blog` and from `sitemap.xml` |
| Hidden project `/projects/hidden-fixture-project` | **404** |
| Article page | canonical, `og:type=article`, `article:published_time`, `article:tag`, Twitter card, JSON-LD `BlogPosting`, TOC anchors, related articles |
| `/blog?q=…` search and `?tag=…` filter | server-rendered filtering via URL |
| Homepage copy, project and article cards | taken from `site_settings` / database rows |
| `sitemap.xml` | contains only published slugs |
| Unauthenticated `/admin`, `/admin/posts`, `/admin/settings` | 307 → `/admin/login?next=…` |
| Signed-out `/admin/login` | 200 with the sign-in form |

The fixture is a **test harness only** — no application code references it, and it cannot
write, so it cannot mask a broken mutation path.

### Not verified here (honest list)

- Playwright end-to-end runs (browser download blocked in this environment).
- A real browser signing in through Supabase Auth (no outbound access to the project from this sandbox) — the credential flow was exercised by unit-mocking the client and by RLS SQL checks instead.
- A real Storage upload, and the hero's video rendering with a licensed file (no video asset is shipped; the designed fallback is what renders).

---

## 10. Deployment

Any Node host works (Vercel is the simplest for Next.js).

1. Push the repository and import it in your host.
2. Add the environment variables from §8 (public ones plus `SUPABASE_SERVICE_ROLE_KEY`, marked as a secret). Set `NEXT_PUBLIC_SITE_URL` to the production origin so canonical URLs and the sitemap are correct.
3. Build command `npm run build`, start command `npm start`.
4. Add the production origin to Supabase *Authentication → URL Configuration*.
5. Apply migrations to the production project (SQL editor or `supabase db push`).
6. Create the administrator as described in §5, then sign in at `/admin/login`.

Note: `next.config.ts` sets `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`
and a `strict-origin-when-cross-origin` referrer policy for all routes.

---

## 11. Known limitations and remaining setup

**You must do (external configuration):**

1. Create the Supabase project and fill in `.env.local` (§4).
2. Apply `supabase/migrations/20261025000000_init.sql`.
3. Create the first administrator and insert its UUID into `admin_users` (§5).
4. Disable public sign-ups.
5. Replace the default biography/homepage copy in **Admin → Settings** with your own — the
   shipped defaults are deliberately generic and claim nothing on your behalf.
6. Delete or replace `supabase/seed.example.sql` content once your own writing is ready.
7. Set `NEXT_PUBLIC_SITE_URL` for production metadata.

**Limitations:**

- The contact-form throttle is in-process memory. Multi-instance/serverless deployments should add an edge rate limiter (e.g. Upstash Ratelimit) in `submitContactMessageAction`.
- Full-text search uses `ilike` over title/excerpt/body. For large archives, add `pg_trgm` or Postgres full-text indexes and switch to `textSearch`.
- Project category filters are not exposed publicly: projects are modelled with free-form technologies plus `featured_order`, which is what the gallery filters by. There is no separate category taxonomy.
- Slug changes do not create redirects from the previous URL; old links 404 by design.
- The Playwright suite has not been executed in this workspace (browser download blocked). Once a browser is available: `npx playwright install chromium && npm run test:e2e`.

---

## 12. Project structure

```
src/
  app/
    (site)/                     public routes (layout with header/footer)
      page.tsx                  homepage
      about/  blog/  projects/  contact/
      not-found.tsx
    admin/
      login/                    public sign-in
      (dashboard)/              guarded layout + overview, posts, projects, media, messages, settings
    sitemap.ts  robots.ts  error.tsx  global-error.tsx  not-found.tsx
  components/
    3d/                         hero-canvas (dynamic), hero-scene (R3F scene)
    site/                       hero, cinematic background, navigation, cards, markdown, forms
    admin/                      shell, forms, editors, tables, media manager
    ui/                         button, input, label, tabs, dialog, primitives
  lib/
    actions/                    server actions (auth, posts, projects, messages, media, settings)
    queries/                    read helpers per entity
    supabase/                   server, browser, admin clients + middleware session refresh
    auth.ts  content.ts  env.ts  hero-media.ts  hero-motion.ts  markdown.ts  media.ts
    settings.ts  validation.ts  utils.ts
  types/                        shared types + generated-style Database types
supabase/
  migrations/20261025000000_init.sql
  seed.example.sql              optional demo content (describes this repo)
public/media/                   hero-poster.jpg placeholder (drop hero.mp4 / hero.webm here)
tests/
  unit/                         Vitest suites
  e2e/                          Playwright suites
  support/mock-postgrest.mjs    read-only fixture server used for offline UI verification
```

---

## Branding

The product name is data, not code: change `brand.name` in **Admin → Settings** (stored in
`site_settings`) and it updates the navigation, footer, page titles and Open Graph site name.
The palette, type scale and radii live in the `@theme` block of `src/app/globals.css`, so the
whole visual system can be retuned in one place.
