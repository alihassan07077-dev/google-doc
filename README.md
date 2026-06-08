# Docs — a collaborative document editor

A lightweight Google-Docs-style editor built with Next.js (App Router), Supabase
(Postgres + Auth + Row Level Security), and Tiptap. Users can create rich-text
documents, edit them with autosave, share them with other accounts at "view" or
"edit" granularity, and import existing `.txt`/`.md` files as new documents.

## Features

- **Auth** — email/password sign up & login via Supabase Auth, session-aware
  routing (Proxy/middleware redirects unauthenticated users to `/login`).
- **Dashboard** — "My documents" (create, rename, delete) and "Shared with me"
  (shows who shared it and your permission level).
- **Rich-text editor** — Tiptap-based editor with a toolbar (bold, italic,
  underline, headings, paragraph, bulleted/numbered lists) and debounced
  autosave with a "Saving… / Saved" indicator.
- **Sharing** — owners share documents by collaborator email with "can view" or
  "can edit" access; access is enforced at the database layer via Row Level
  Security, not just hidden in the UI.
- **File import** — upload a `.txt` or `.md` file (max 1 MB) and it's converted
  into a new editable document; Markdown headings, bold/italic, and lists are
  translated into the corresponding rich-text formatting.
- **Validation & error handling** — inline error messages for auth, sharing,
  uploads, and saves; loading states throughout.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, Turbopack, TypeScript)
- [Supabase](https://supabase.com) — Postgres database, Auth, Row Level Security
- [Tiptap](https://tiptap.dev) — rich-text editor (built on ProseMirror)
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [Vitest](https://vitest.dev) + Testing Library — unit tests

## Getting started

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon/public key**.
3. In the **SQL Editor**, run the migration at
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the `documents` and `document_shares` tables, Row Level
   Security policies, and two helper RPC functions
   (`find_user_id_by_email`, `shared_documents_with_owner`).
4. In **Authentication → Sign In / Providers → Email**, turn **off** "Confirm
   email" — this demo doesn't configure an SMTP provider, so confirmation
   emails would never be delivered and accounts would be stuck unverified.

> If you provisioned your project before the RLS recursion fix landed, also
> run [`supabase/migrations/0002_fix_rls_recursion.sql`](supabase/migrations/0002_fix_rls_recursion.sql) —
> see [ARCHITECTURE.md](ARCHITECTURE.md#a-bug-we-hit-rls-infinite-recursion) for why it's needed.
> Fresh installs of `0001_init.sql` already include the fix.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project's values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The anon key is safe to expose to the browser — Row Level Security is what
actually enforces access control (see [ARCHITECTURE.md](ARCHITECTURE.md)).

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up with any email and
a 6+ character password (no email confirmation needed — see step 1.4), and
start creating documents.

### 4. Run tests

```bash
npm test
```

## Project structure

```
src/
  app/
    api/upload/          File upload endpoint (.txt/.md → document)
    api/auth/signout/    Sign-out route handler
    dashboard/           Dashboard page (server component, fetches documents)
    documents/[id]/      Document editor page
    login/, signup/      Auth pages
  components/
    editor/              Tiptap RichTextEditor + Toolbar
    DashboardClient.tsx  Dashboard interactions (create/rename/delete/upload)
    DocumentEditorClient.tsx  Editor shell (rename, autosave, permissions)
    ShareDialog.tsx      Share-by-email dialog
    UploadDialog.tsx     File upload dialog
  lib/
    supabase/            Browser/server/proxy Supabase clients + DB types
    editor/              Markdown → Tiptap JSON conversion (+ tests)
  proxy.ts               Session refresh + route protection (App Router "Proxy")
supabase/
  migrations/            SQL schema, RLS policies, RPC functions
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions and trade-offs, and
[AI_WORKFLOW.md](AI_WORKFLOW.md) for how AI tools were used while building this.
