-- Collaborative Document Editor — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- documents
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Untitled document',
  content     jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_owner_id_idx on public.documents (owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- document_shares  (who else can see/edit a document)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.document_shares (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references public.documents (id) on delete cascade,
  shared_with_user_id uuid not null references auth.users (id) on delete cascade,
  permission          text not null default 'edit' check (permission in ('view', 'edit')),
  created_at          timestamptz not null default now(),
  unique (document_id, shared_with_user_id)
);

create index if not exists document_shares_document_id_idx on public.document_shares (document_id);
create index if not exists document_shares_shared_with_user_id_idx on public.document_shares (shared_with_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS helper functions
--
-- documents' "shared with me" policies need to check document_shares, and
-- document_shares' "owner can manage" policies need to check documents — a
-- direct cross-reference cycles and Postgres reports "infinite recursion
-- detected in policy". SECURITY DEFINER functions run with the privileges of
-- their owner (bypassing RLS for the queries inside them), which breaks the
-- cycle. This is the standard Supabase pattern for cross-table RLS checks.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.user_has_document_share(doc_id uuid, require_edit boolean default false)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.document_shares ds
    where ds.document_id = doc_id
      and ds.shared_with_user_id = auth.uid()
      and (not require_edit or ds.permission = 'edit')
  );
$$;

create or replace function public.user_owns_document(doc_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id
      and d.owner_id = auth.uid()
  );
$$;

revoke all on function public.user_has_document_share(uuid, boolean) from public;
revoke all on function public.user_owns_document(uuid) from public;
grant execute on function public.user_has_document_share(uuid, boolean) to authenticated;
grant execute on function public.user_owns_document(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

-- documents: owners have full control
drop policy if exists "documents_owner_select" on public.documents;
create policy "documents_owner_select" on public.documents
  for select using (owner_id = auth.uid());

drop policy if exists "documents_owner_insert" on public.documents;
create policy "documents_owner_insert" on public.documents
  for insert with check (owner_id = auth.uid());

drop policy if exists "documents_owner_update" on public.documents;
create policy "documents_owner_update" on public.documents
  for update using (owner_id = auth.uid());

drop policy if exists "documents_owner_delete" on public.documents;
create policy "documents_owner_delete" on public.documents
  for delete using (owner_id = auth.uid());

-- documents: shared users can read, and edit if granted 'edit' permission
drop policy if exists "documents_shared_select" on public.documents;
create policy "documents_shared_select" on public.documents
  for select using (public.user_has_document_share(documents.id, false));

drop policy if exists "documents_shared_update" on public.documents;
create policy "documents_shared_update" on public.documents
  for update using (public.user_has_document_share(documents.id, true));

-- document_shares: owner of the document can manage shares
drop policy if exists "shares_owner_select" on public.document_shares;
create policy "shares_owner_select" on public.document_shares
  for select using (public.user_owns_document(document_shares.document_id));

drop policy if exists "shares_owner_insert" on public.document_shares;
create policy "shares_owner_insert" on public.document_shares
  for insert with check (public.user_owns_document(document_shares.document_id));

drop policy if exists "shares_owner_delete" on public.document_shares;
create policy "shares_owner_delete" on public.document_shares
  for delete using (public.user_owns_document(document_shares.document_id));

-- document_shares: a user can see the share rows that grant *them* access
-- (so they know who shared a document with them, and at what permission)
drop policy if exists "shares_recipient_select" on public.document_shares;
create policy "shares_recipient_select" on public.document_shares
  for select using (shared_with_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: look up a user id by email (auth.users isn't queryable from the client)
-- SECURITY DEFINER so it can read auth.users, but it only ever returns an id —
-- never any other account details — and any authenticated user may call it.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: list of {document_id, owner_email} for documents shared with the caller
-- (lets the dashboard show "Shared by <email>" without exposing auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.shared_documents_with_owner()
returns table (
  id uuid,
  title text,
  content jsonb,
  updated_at timestamptz,
  owner_id uuid,
  owner_email text,
  permission text
)
language sql
security definer
set search_path = public, auth
as $$
  select d.id, d.title, d.content, d.updated_at, d.owner_id,
         u.email::text as owner_email, ds.permission
  from public.document_shares ds
  join public.documents d on d.id = ds.document_id
  join auth.users u on u.id = d.owner_id
  where ds.shared_with_user_id = auth.uid();
$$;

revoke all on function public.shared_documents_with_owner() from public;
grant execute on function public.shared_documents_with_owner() to authenticated;
