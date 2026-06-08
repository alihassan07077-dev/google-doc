# Submission

## Deliverables

| Item | Location |
|------|----------|
| Source code | This repository (GitHub) |
| Live app | Vercel deployment URL (see below) |
| README | [README.md](README.md) |
| Architecture notes | [ARCHITECTURE.md](ARCHITECTURE.md) |
| AI workflow notes | [AI_WORKFLOW.md](AI_WORKFLOW.md) |
| Environment template | [.env.example](.env.example) |

## Live deployment

> Fill in the Vercel deployment URL once deployed.

**URL:** `https://assignment-YOURNAME.vercel.app`

## Test accounts

Two accounts are pre-registered on the live Supabase project for reviewer use:

| Email | Password | Role in the demo |
|-------|----------|-----------------|
| `alice.tester@gmail.com` | `password123` | Document owner — has created documents and shared one with Bob |
| `bob.tester@gmail.com` | `password123` | Collaborator — has a document shared with "can edit" and one with "view only" |

> These accounts are seeded against the production Supabase project.
> If you are running locally with a different Supabase project you will need
> to sign up your own accounts via `/signup`.

## Functionality checklist

- [x] Email/password signup and login
- [x] Session-aware routing (unauthenticated → `/login`, authenticated → dashboard)
- [x] Dashboard: "My Documents" section (create, rename, delete)
- [x] Dashboard: "Shared with Me" section (shows owner email and permission badge)
- [x] Rich-text editor with toolbar: bold, italic, underline, headings (H1–H3), paragraph, bulleted list, numbered list
- [x] Debounced autosave with "Saving… / Saved / error" indicator
- [x] Inline title rename (editor and dashboard)
- [x] Share dialog: enter collaborator email, choose "can view" or "can edit"
- [x] Permission enforcement via Postgres Row Level Security (view-only users cannot save edits)
- [x] File upload (.txt / .md → new editable document, max 1 MB)
- [x] Markdown-to-rich-text conversion (headings, bold, italic, lists)
- [x] Input validation and inline error messages throughout
- [x] Loading states on all async actions
- [x] Automated unit tests (Vitest) — `npm test`

## Known limitations

- No real-time concurrent editing (last save wins if two people edit simultaneously).
- No version history beyond the browser's local undo stack.
- Markdown import covers the subset of syntax the editor toolbar supports; exotic Markdown (tables, code fences, links) is imported as plain text.
- Email confirmation is disabled (no SMTP configured); accounts are immediately active.
