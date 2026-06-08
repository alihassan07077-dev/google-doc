-- Fixes "infinite recursion detected in policy for relation documents":
-- documents' policies queried document_shares, whose policies queried
-- documents back, forming a cycle that Postgres' RLS planner can't resolve.
--
-- The fix is the standard Supabase pattern: move the cross-table checks into
-- SECURITY DEFINER helper functions. Such functions run with the privileges
-- of their owner (the table owner, e.g. `postgres`), so RLS is not
-- re-evaluated for the queries inside them — breaking the cycle.

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

-- Re-point the recursive policies at the helper functions instead of
-- querying the other RLS-protected table directly.
drop policy if exists "documents_shared_select" on public.documents;
create policy "documents_shared_select" on public.documents
  for select using (public.user_has_document_share(documents.id, false));

drop policy if exists "documents_shared_update" on public.documents;
create policy "documents_shared_update" on public.documents
  for update using (public.user_has_document_share(documents.id, true));

drop policy if exists "shares_owner_select" on public.document_shares;
create policy "shares_owner_select" on public.document_shares
  for select using (public.user_owns_document(document_shares.document_id));

drop policy if exists "shares_owner_insert" on public.document_shares;
create policy "shares_owner_insert" on public.document_shares
  for insert with check (public.user_owns_document(document_shares.document_id));

drop policy if exists "shares_owner_delete" on public.document_shares;
create policy "shares_owner_delete" on public.document_shares
  for delete using (public.user_owns_document(document_shares.document_id));
