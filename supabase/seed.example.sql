-- ============================================================================
-- NEXORA — optional sample content
-- ----------------------------------------------------------------------------
-- This file is NOT a migration. It is documented demo content that describes
-- this actual codebase (no invented achievements, metrics or client names).
-- Replace or delete it once your own writing and projects are ready:
--
--   psql "$SUPABASE_DB_URL" -f supabase/seed.example.sql
--   -- or paste into the Supabase SQL editor
--
-- Safe to re-run: rows are matched on their unique slug.
-- ============================================================================

insert into public.projects (
  title, slug, summary, description, cover_image_url, technologies,
  demo_url, repository_url, is_published, featured_order
)
values (
  'NEXORA — cinematic portfolio platform',
  'nexora-cinematic-portfolio',
  'A personal portfolio and editorial platform with a procedural 3D hero, a markdown blog and a Supabase-backed admin dashboard.',
  $md$## The brief

NEXORA needed to be a real product rather than a landing-page shell: cinematic presentation on the surface, and a database-backed publishing system underneath.

## Architecture

- **Next.js App Router** with server components for public content and client components only where interaction requires them.
- **React Three Fiber** for a procedural hero artifact that reacts to pointer movement through damped interpolation — never a direct snap to the cursor.
- **Supabase** for PostgreSQL, Auth and Storage, with Row Level Security as the authority for every write.
- **GSAP + ScrollTrigger** for restrained section reveals that never hijack native scrolling.

## Interesting constraints

1. The hero must look finished even if WebGL is unavailable, the visitor prefers reduced motion, or the background video is missing.
2. Drafts must never appear in HTML, in search results, in related-article lists or in the sitemap.
3. Every admin mutation re-verifies the allowlist server-side, because server actions are publicly reachable endpoints.

## Result

A single deployable application where publishing, project management, media and contact messages all round-trip through PostgreSQL, and the public site degrades gracefully instead of failing loudly.
$md$,
  null,
  array['Next.js', 'TypeScript', 'Three.js', 'React Three Fiber', 'Supabase', 'Tailwind CSS', 'GSAP'],
  null,
  null,
  true,
  1
)
on conflict (slug) do update
  set summary = excluded.summary,
      description = excluded.description,
      technologies = excluded.technologies,
      is_published = excluded.is_published,
      featured_order = excluded.featured_order;

insert into public.posts (
  title, slug, excerpt, content_md, tags, status, published_at,
  seo_title, seo_description
)
values (
  'Designing a damped 3D hero with React Three Fiber',
  'damped-3d-hero-react-three-fiber',
  'A pointer-reactive artifact that feels physical: damped rotation, a procedural environment and a render loop that pauses when nobody is looking.',
  $md$The hero object is the first thing a visitor interacts with, so it has to feel considered rather than decorative. Three decisions shaped this one.

## 1. Damped motion, not pointer mirroring

Mapping the cursor straight onto rotation reads as jittery. Instead the target angle is derived from R3F's normalised pointer and the mesh eases toward it every frame:

```ts
node.rotation.y = THREE.MathUtils.damp(node.rotation.y, pointer.x * 0.32, 4, delta);
node.position.x = THREE.MathUtils.damp(node.position.x, pointer.x * 0.14, 3, delta);
```

`MathUtils.damp` is frame-rate independent, so the feel is identical at 60 Hz and 120 Hz. Pointer state never enters React state — it lives in refs and is read inside `useFrame`, which keeps the component from re-rendering on every mouse event.

> The rule of thumb: React renders the scene, the render loop animates it. Mixing the two is where interactive 3D usually starts to stutter.

## 2. Reflection without a download

Environment maps normally mean shipping an HDR file. Drei's `Environment` can render a scene of `Lightformer` panels into a cube map instead, so the smoked metal core picks up believable highlights while the page payload stays at zero extra kilobytes. Two coloured point lights add the cyan and violet rim that ties the object to the brand palette.

## 3. Falling back deliberately

Not every visitor should download a WebGL scene. The wrapper component decides once, on the client:

| Condition | Treatment |
| --- | --- |
| `prefers-reduced-motion` | Static CSS artifact |
| Save-Data or 2G | Static CSS artifact |
| Viewport under 768 px | Static CSS artifact |
| No WebGL context | Static CSS artifact |
| Otherwise | Interactive canvas, DPR capped at 1.75 |

The static artifact is composed from the same gradients and orbital rings, so the hero still looks intentional — it simply stops moving.

## Cost control

- The canvas dynamically imports, keeping Three.js out of the initial HTML payload.
- `frameloop` switches to `never` when an `IntersectionObserver` reports the hero is off-screen.
- The particle field is a single draw call of about six hundred points.

The result responds to the mouse within a bounded range, never fights the scroll, and disappears politely when the device (or the person) would rather it did.
$md$,
  array['Three.js', 'React Three Fiber', 'WebGL', 'Design engineering'],
  'published',
  now() - interval '2 days',
  'A damped 3D hero in React Three Fiber',
  'How the NEXORA hero combines damped pointer motion, a procedural environment and honest fallbacks for reduced motion, small screens and missing WebGL.'
),
(
  'Keeping drafts private with Row Level Security',
  'keeping-drafts-private-row-level-security',
  'Authorization is a database concern first and a UI concern second. Here is how the NEXORA schema makes unpublished content unreachable rather than merely hidden.',
  $md$A draft that is filtered out in JavaScript is still a draft that was sent to the browser. NEXORA treats publication as a database-level fact.

## The policy

Every read of `posts` passes through one policy:

```sql
create policy "posts_public_read_published"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());
```

Anonymous visitors can only ever receive published rows. Administrators see drafts because `is_admin()` consults an allowlist keyed to `auth.uid()`.

## Why a security-definer helper

`is_admin()` is `security definer`, so RLS policies can check the allowlist without granting a recursive SELECT policy on `admin_users` itself. The function is granted to `anon` and `authenticated` but cannot be used to read the table directly.

## Server actions are public endpoints

A server action is an HTTP endpoint. Hiding the delete button changes nothing. Every action therefore starts the same way:

```ts
const auth = await requireAdminForAction();
if (!auth.ok) return { ok: false, error: auth.error };
```

Only after the allowlist check does the query run — with the caller's JWT, so RLS applies a second time.

## Contact messages

Insert-only for the public, read-only for administrators:

- `insert` is allowed for `anon` with a shape check that also forces `is_read = false`.
- There is no public `select` policy at all, so no endpoint can list submissions.

## Verification

Policy behaviour was checked by switching roles inside a transaction and attempting the operations an attacker would try: reading a draft as `anon`, inserting a post as an authenticated non-admin, and selecting `contact_messages` as an anonymous visitor. Each attempt returned zero rows or an RLS violation.
$md$,
  array['Supabase', 'PostgreSQL', 'Security', 'Row Level Security'],
  'published',
  now() - interval '9 days',
  null,
  'How Row Level Security makes unpublished content unreachable instead of merely hidden in the interface.'
),
(
  'Notes on building the NEXORA content model',
  'notes-on-the-nexora-content-model',
  'Working notes on the schema decisions behind posts, projects, media and settings.',
  $md$This draft exists to demonstrate that unpublished content never reaches the public site. Open `/blog` while signed out — this article is absent from the listing, the sitemap and the related-article queries.

## Decisions in progress

- Post tags are stored as a `text[]` with a GIN index; filtering uses `contains`.
- Publication dates are mandatory once a post is published, enforced by a check constraint rather than application code.
- Project ordering uses `featured_order`, where zero means "not featured on the homepage".

Publish this once you have something worth saying — or delete it.
$md$,
  array['PostgreSQL', 'Content model'],
  'draft',
  null,
  null,
  null
)
on conflict (slug) do update
  set title = excluded.title,
      excerpt = excluded.excerpt,
      content_md = excluded.content_md,
      tags = excluded.tags,
      status = excluded.status,
      published_at = excluded.published_at;
