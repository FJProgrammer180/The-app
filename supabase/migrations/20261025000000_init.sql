-- ============================================================================
-- NEXORA — initial schema
-- ----------------------------------------------------------------------------
-- Tables: admin_users, posts, projects, contact_messages, site_settings
-- Includes: constraints, indexes, updated_at triggers, RLS policies,
--           storage bucket + object policies, first-admin helper.
-- Idempotent enough to be re-run on a fresh project.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_users — explicit allowlist of authenticated administrators
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Allowlist of Supabase Auth users that may administer NEXORA. Rows may only be inserted with the service role or from the SQL editor.';

-- SECURITY DEFINER so that RLS policies on other tables can consult the
-- allowlist without granting a recursive SELECT policy on admin_users.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.admin_users enable row level security;

-- Admins can see the allowlist (useful for diagnostics); nobody can write to it
-- through the API. There is deliberately no INSERT/UPDATE/DELETE policy.
drop policy if exists "admin_users_select_self_or_admin" on public.admin_users;
create policy "admin_users_select_self_or_admin"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (length(trim(title)) between 1 and 200),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt           text,
  content_md        text not null,
  cover_image_url   text,
  hero_media_url    text,
  tags              text[] not null default '{}',
  status            text not null default 'draft' check (status in ('draft', 'published')),
  published_at      timestamptz,
  seo_title         text,
  seo_description   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- A published post must always carry a publication timestamp.
  constraint posts_published_requires_date
    check (status <> 'published' or published_at is not null)
);

create index if not exists posts_public_listing_idx
  on public.posts (status, published_at desc nulls last);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);
-- Case-insensitive free-text search on the public listing is done via ilike;
-- a trigram index would need pg_trgm, so keep the title index simple.
create index if not exists posts_title_lower_idx on public.posts (lower(title));

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

drop policy if exists "posts_public_read_published" on public.posts;
create policy "posts_public_read_published"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "posts_admin_insert" on public.posts;
create policy "posts_admin_insert"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "posts_admin_update" on public.posts;
create policy "posts_admin_update"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "posts_admin_delete" on public.posts;
create policy "posts_admin_delete"
  on public.posts for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (length(trim(title)) between 1 and 200),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary         text,
  description     text,
  cover_image_url text,
  technologies    text[] not null default '{}',
  demo_url        text check (demo_url is null or demo_url ~* '^https?://'),
  repository_url  text check (repository_url is null or repository_url ~* '^https?://'),
  is_published    boolean not null default false,
  featured_order  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_public_listing_idx
  on public.projects (is_published, featured_order asc, created_at desc);
create index if not exists projects_tech_idx on public.projects using gin (technologies);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

drop policy if exists "projects_public_read_published" on public.projects;
create policy "projects_public_read_published"
  on public.projects for select
  to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists "projects_admin_insert" on public.projects;
create policy "projects_admin_insert"
  on public.projects for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "projects_admin_update" on public.projects;
create policy "projects_admin_update"
  on public.projects for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "projects_admin_delete" on public.projects;
create policy "projects_admin_delete"
  on public.projects for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- contact_messages — public insert only, admin read/update/delete
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 120),
  email      text not null check (position('@' in email) > 1),
  subject    text not null check (length(trim(subject)) between 1 and 200),
  message    text not null check (length(trim(message)) between 10 and 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_unread_idx
  on public.contact_messages (is_read) where is_read = false;

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages_public_insert" on public.contact_messages;
create policy "contact_messages_public_insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (
    length(trim(name)) between 1 and 120
    and position('@' in email) > 1
    and length(trim(subject)) between 1 and 200
    and length(trim(message)) between 10 and 5000
    and is_read = false
  );

drop policy if exists "contact_messages_admin_read" on public.contact_messages;
create policy "contact_messages_admin_read"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin());

drop policy if exists "contact_messages_admin_update" on public.contact_messages;
create policy "contact_messages_admin_update"
  on public.contact_messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contact_messages_admin_delete" on public.contact_messages;
create policy "contact_messages_admin_delete"
  on public.contact_messages for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- site_settings — key/value JSONB, public read, admin write
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key check (key ~ '^[a-z0-9_]+$'),
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

-- Public read is required to render settings-driven copy with the anon key.
-- Never store secrets in this table.
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "site_settings_admin_insert" on public.site_settings;
create policy "site_settings_admin_insert"
  on public.site_settings for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "site_settings_admin_update" on public.site_settings;
create policy "site_settings_admin_update"
  on public.site_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "site_settings_admin_delete" on public.site_settings;
create policy "site_settings_admin_delete"
  on public.site_settings for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage — public "media" bucket, admin-only writes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MiB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Default site settings (copy only — no invented achievements)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('brand', '{"name":"NEXORA","tagline":"A personal digital universe"}'::jsonb),
  ('home', '{
     "eyebrow": "Personal digital universe",
     "headline": "Exploring ideas. Engineering possibilities.",
     "intro": "I build thoughtful software at the intersection of engineering, design and applied AI. NEXORA is where the work, the experiments and the writing live.",
     "primary_cta_label": "View projects",
     "primary_cta_href": "/projects",
     "secondary_cta_label": "Read the blog",
     "secondary_cta_href": "/blog"
   }'::jsonb),
  ('about', '{
     "display_name": "Site owner",
     "role": "Software engineer",
     "bio": "This biography is editable from the admin dashboard. Sign in as an administrator and open Settings to describe who you are, what you are learning and where you are going.",
     "learning": [],
     "goals": [],
     "skills": [],
     "timeline": []
   }'::jsonb),
  ('social', '{"github":"","x":"","linkedin":"","email":""}'::jsonb),
  ('contact', '{
     "heading": "Start a conversation",
     "intro": "Have a project, an idea or a question? Send a message and it will be stored securely for the site owner to read."
   }'::jsonb)
on conflict (key) do nothing;
