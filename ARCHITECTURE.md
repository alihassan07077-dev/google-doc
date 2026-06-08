# Architecture

## Overview

This is a server-rendered Next.js (App Router) application backed entirely by
Supabase — there is no separate backend service. Authentication, data storage,
authorization, and the "look up a collaborator by email" capability are all
provided by Supabase (Postgres + Auth + PostgREST + RPC functions). Next.js
server components fetch data directly with a server-side Supabase client;
client components use a browser Supabase client for interactive mutations
(create, rename, delete, share, autosave).

```
Browser ── React (client components) ──┐
                                        ├─→ Supabase (Postgres + Auth + RLS)
Next.js server components/routes ───────┘
```

## Data model

Two tables, defined in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):

- **`documents`** — `id, owner_id, title, content (jsonb), created_at, updated_at`.
  `content` stores the editor state as Tiptap's JSON document format directly —
  no serialization/parsing step is needed when loading or saving.
- **`document_shares`** — `document_id, shared_with_user_id, permission ('view'|'edit')`.
  A join row per (document, collaborator) pair; `unique(document_id, shared_with_user_id)`
  means re-sharing with the same person updates their permission rather than
  duplicating rows (the app uses `upsert` with `onConflict`).

`auth.users` (managed by Supabase Auth) is the source of truth for accounts;
the app never duplicates user records into `public` tables.

## Authorization: Row Level Security, not application checks

All access control is enforced by Postgres Row Level Security policies — the
same policies apply whether the request comes from the Next.js server, the
browser, or any other client that holds a user's session. The app's UI hides
controls the user can't use (e.g. no "Share" button on documents you don't
own), but that's a UX nicety; the database is what actually prevents
unauthorized reads/writes. This was a deliberate choice over checking
permissions in API routes: it means there's exactly one place access rules
live, and it's impossible to bypass them by calling Supabase directly from the
browser (which the app does, for most mutations).

Policy summary:
- Owners can select/insert/update/delete their own documents and manage shares
  on them.
- A user with a `document_shares` row can always read the shared document, and
  can update it only if their `permission = 'edit'`.
- A user can see the share rows that grant *them* access (so the dashboard can
  show "shared by X" and the permission level).

### A bug we hit: RLS infinite recursion

The natural way to write "a shared user can read a document" is a policy on
`documents` that subqueries `document_shares`:

```sql
-- documents_shared_select
exists (select 1 from document_shares ds where ds.document_id = documents.id and ...)
```

And the natural way to write "the document owner can manage its shares" is a
policy on `document_shares` that subqueries `documents`:

```sql
-- shares_owner_select
exists (select 1 from documents d where d.id = document_shares.document_id and d.owner_id = auth.uid())
```

Both tables have RLS enabled, so evaluating the first policy requires
evaluating the second table's policies, which requires evaluating the first
table's policies again — Postgres detects this and raises `infinite recursion
detected in policy for relation "documents"`.

The fix (the standard Supabase pattern for cross-table RLS checks) is to move
each cross-table check into a `SECURITY DEFINER` SQL function
(`user_has_document_share`, `user_owns_document` — see
[`0001_init.sql`](supabase/migrations/0001_init.sql)). Such functions execute
with the privileges of their owner (a superuser in Supabase's case), so the
queries inside them bypass RLS entirely — breaking the cycle while preserving
the same access semantics. `supabase/migrations/0002_fix_rls_recursion.sql`
contains the same fix as a standalone migration for projects that ran the
schema before this was caught.

## Looking up collaborators by email

The client only ever has the anon key, and `auth.users` isn't exposed through
PostgREST — so there's no direct way to turn "bob@example.com" into a user id
from the browser. `find_user_id_by_email(text) returns uuid` is a
`SECURITY DEFINER` RPC function that performs that one lookup and returns
*only* the id (never any other account field), grantable to `authenticated`
users. This keeps the "share by email" UX possible without exposing the
`auth` schema or requiring a service-role key in the client.

Similarly, `shared_documents_with_owner()` returns the documents shared with
the calling user *joined with the owner's email*, so the dashboard can show
"Shared by alice@example.com" — again without exposing `auth.users` directly.

## Editor content format

Tiptap documents are JSON (`JSONContent`). Storing that JSON directly in a
`jsonb` column means:
- No format conversion between "what's in the database" and "what the editor
  needs" — `documents.content` is loaded straight into `useEditor({ content })`
  and saved straight from `editor.getJSON()`.
- Postgres can index/query into the structure if ever needed (not used here,
  but available).

## Autosave

`DocumentEditorClient` debounces `onUpdate` events from the editor (1.5s) and
persists the latest JSON snapshot via `supabase.from('documents').update(...)`.
A small status indicator reflects `idle → saving → saved/error`. This avoids a
network round-trip on every keystroke while still saving promptly after the
user pauses.

## File import → rich text

Uploaded `.txt`/`.md` files are converted into Tiptap JSON server-side (in
[`src/app/api/upload/route.ts`](src/app/api/upload/route.ts), using
[`src/lib/editor/markdown-to-tiptap.ts`](src/lib/editor/markdown-to-tiptap.ts))
rather than stored as raw text and rendered separately. This means an imported
document is immediately a normal, fully-editable document — not a
special-cased read-only view. The Markdown converter intentionally covers only
the subset the editor itself supports (headings, bold, italic, bulleted/numbered
lists, paragraphs); it's not a general CommonMark parser, because round-tripping
into the app's own rich-text model is the actual goal, not Markdown fidelity
for its own sake.

## Auth & session handling

Supabase's `@supabase/ssr` package provides three integration points, all used
here:
- `createBrowserClient` — for client components (mutations, the editor).
- `createServerClient` (in `src/lib/supabase/server.ts`) — for server
  components and route handlers, reading the session from cookies.
- A Proxy (`src/proxy.ts` + `src/lib/supabase/proxy.ts`) that runs on every
  request, refreshes the session cookie, and redirects unauthenticated users
  away from protected routes (and authenticated users away from `/login`/`/signup`).

> Note: this Next.js version renamed the `middleware` file convention to
> `proxy` (see `AGENTS.md` / the deprecation notice Next.js prints) — the file
> is named and exported accordingly.

## Trade-offs & things deliberately left out

- **No real-time collaboration (e.g. concurrent cursors / CRDT merging).** The
  brief asks for sharing and editing, not simultaneous co-editing; adding
  Supabase Realtime + a CRDT (e.g. Yjs) would be a substantial addition. Two
  people can share and edit the same document today — just not see each
  other's keystrokes live, and the last save wins.
- **No version history / undo beyond the editor's local history.** Out of
  scope for the brief; would need either periodic snapshots or an append-only
  change log.
- **Markdown conversion is intentionally partial.** It supports exactly the
  formatting the editor's toolbar supports. A "real" Markdown parser would add
  a dependency and handle syntax (tables, code fences, links, nested lists)
  the editor has no UI for anyway.
- **No email confirmation.** Supabase's default requires a configured SMTP
  provider to deliver confirmation emails; without one, accounts would be
  permanently stuck "unconfirmed". Turning it off is the standard approach for
  demo/assignment projects (see README setup step 1.4).
