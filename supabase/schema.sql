-- The-app — chat persistence schema (idempotent)
create table if not exists public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null,
  title       text not null default 'New conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ai_conversations_client_updated_idx
  on public.ai_conversations (client_id, updated_at desc);

create table if not exists public.ai_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages       enable row level security;

drop policy if exists ai_conversations_all on public.ai_conversations;
create policy ai_conversations_all on public.ai_conversations
  for all to anon, authenticated using (true) with check (true);

drop policy if exists ai_messages_all on public.ai_messages;
create policy ai_messages_all on public.ai_messages
  for all to anon, authenticated using (true) with check (true);

create or replace function public.touch_ai_conversation() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_conversations_touch on public.ai_conversations;
create trigger ai_conversations_touch before update
  on public.ai_conversations for each row execute function public.touch_ai_conversation();
