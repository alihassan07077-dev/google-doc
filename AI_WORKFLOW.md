# AI Workflow

This document describes how AI tools were used to build this project.

## Tool used

[Claude Code](https://claude.ai/code) (claude-sonnet-4-6) — Anthropic's
agentic CLI — drove the entire build from a blank `create-next-app` scaffold
to a deployed, tested application. The workflow was conversational: I described
what I wanted at a high level, then the AI planned, wrote, debugged, and
iterated on each piece while I reviewed the results and gave direction.

## What the AI did

**Architecture and planning** — Claude drafted the database schema, RLS policy
structure, and component decomposition before writing a line of code. The plan
was presented for approval; I approved it without changes.

**Code generation** — essentially all the code was AI-written: the Supabase
schema/migrations, TypeScript types, server components, client components,
the Tiptap editor wrapper and toolbar, the file-upload endpoint, the
Markdown→Tiptap converter, the Proxy session handler, and the Vitest test
suite. My role was to read the generated code, apply it (run migrations, set
env vars, check output), and steer the next step.

**Debugging** — three non-trivial bugs were caught and fixed by the AI during
the session:
1. **TypeScript type-system mismatch** — Supabase's generic types (`GenericSchema`,
   `GenericTable`, `GenericFunction`) perform structural matching that TypeScript
   `interface` declarations satisfy more loosely than `type` aliases.  Switching
   all four database-type declarations from `interface` to `type` cleared a cascade
   of "Object literal may only specify known properties" and "Argument is not
   assignable to parameter of type 'never'" errors. The AI traced the problem
   to the `@supabase/postgrest-js` source before landing on the fix.
2. **Next.js naming-convention change** — this Next.js version (16.2.7) renamed
   the `middleware.ts` convention to `proxy.ts`.  The AI discovered this via
   the deprecation warning in the dev-server output and by reading
   `node_modules/next/dist/docs/` (as instructed in `AGENTS.md`) before any code
   was written.
3. **RLS infinite recursion** — the schema's cross-table policy references
   (`documents` policies subquerying `document_shares` and vice-versa) triggered
   Postgres's cycle-detection at runtime during file upload.  The AI diagnosed
   the "infinite recursion detected in policy" error, explained the root cause,
   and produced both a standalone fix migration (`0002_fix_rls_recursion.sql`)
   for the already-provisioned database and a corrected `0001_init.sql` for
   fresh installs. See [ARCHITECTURE.md](ARCHITECTURE.md#a-bug-we-hit-rls-infinite-recursion)
   for the technical explanation.

**Testing** — the AI wrote the Vitest unit tests for the Markdown converter and
drove an end-to-end Playwright test suite against the live app (real Supabase
backend, locally-installed Chrome), covering: signup, document creation,
rich-text editing and formatting, autosave, rename (both dashboard and
editor), file upload with Markdown conversion, share-dialog validation (email
not found), and a full two-account share/edit/view-only permission flow.

**Documentation** — this file, `README.md`, and `ARCHITECTURE.md` were all
AI-written.

## What I did

- Provided the assignment brief and stack preferences.
- Created the Supabase project and pasted the credentials into the chat.
- Ran the SQL migrations in the Supabase SQL editor.
- Disabled email confirmation in the Supabase dashboard (so test signups work
  without an SMTP provider).
- Reviewed the code, approved the plan, and gave direction at each step ("continue", "looks good", etc.).
- Watched the Playwright tests run and observed the screenshots.

## Observations on the workflow

The AI-assisted approach was most valuable for **boilerplate elimination** (auth
wiring, RLS policies, TypeScript generics) and for **debugging obscure
framework/library interactions** (the Supabase type system issue and the Next.js
file-convention rename would have been time-consuming to track down manually).
It was less hands-off for **infrastructure** (Supabase project creation,
environment variables, running migrations) — those steps required real
credentials and browser access that the AI couldn't have on its own.

The biggest risk with this kind of workflow is not reviewing generated code
carefully enough — the AI occasionally made plausible-looking but wrong
assumptions (e.g. a placeholder in the document editor page that called the
wrong RPC function with the wrong arguments). Catching these required actually
reading the code, not just running it and checking the happy path.
