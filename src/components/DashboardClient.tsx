"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShareDialog } from "@/components/ShareDialog";
import { UploadDialog } from "@/components/UploadDialog";
import type { DocumentRow, SharedDocumentWithOwner } from "@/lib/supabase/types";

interface DashboardClientProps {
  ownedDocuments: DocumentRow[];
  sharedDocuments: SharedDocumentWithOwner[];
  loadError: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function DashboardClient({ ownedDocuments, sharedDocuments, loadError }: DashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(loadError);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setActionError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setActionError("Your session expired. Please log in again.");
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({ owner_id: user.id, title: "Untitled document" })
      .select("id")
      .single();

    setCreating(false);

    if (error || !data) {
      setActionError(error?.message ?? "Could not create the document.");
      return;
    }

    router.push(`/documents/${data.id}`);
  }

  function startRename(doc: DocumentRow) {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
  }

  async function commitRename(docId: string) {
    const title = renameValue.trim();
    setRenamingId(null);

    if (!title) {
      setActionError("Title cannot be empty.");
      return;
    }

    const { error } = await supabase.from("documents").update({ title }).eq("id", docId);
    if (error) {
      setActionError(error.message);
      return;
    }
    router.refresh();
  }

  async function handleDelete(doc: DocumentRow) {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;

    setDeletingId(doc.id);
    setActionError(null);

    const { error } = await supabase.from("documents").delete().eq("id", doc.id);

    setDeletingId(null);

    if (error) {
      setActionError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Your workspace</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Create, manage, and share your documents</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md disabled:opacity-60"
          >
            {creating ? (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
            {creating ? "Creating…" : "New document"}
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {/* My documents */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">My documents</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
            {ownedDocuments.length}
          </span>
        </div>
        {ownedDocuments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
              <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700">No documents yet</p>
              <p className="text-sm text-zinc-500">Create one or upload a file to get started.</p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {ownedDocuments.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  {renamingId === doc.id ? (
                    <input
                      aria-label="Document title"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(doc.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(doc.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="w-full max-w-sm rounded-lg border border-indigo-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={openingId === doc.id}
                      onClick={() => { setOpeningId(doc.id); router.push(`/documents/${doc.id}`); }}
                      className="flex items-center gap-1.5 truncate text-left text-sm font-semibold text-zinc-900 hover:text-indigo-600 disabled:opacity-60"
                    >
                      {openingId === doc.id && <Spinner />}
                      {doc.title}
                    </button>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-400">Updated {formatDate(doc.updated_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => startRename(doc)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareTarget({ id: doc.id, title: doc.title })}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === doc.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shared with me */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Shared with me</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
            {sharedDocuments.length}
          </span>
        </div>
        {sharedDocuments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
              <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700">Nothing shared with you yet</p>
              <p className="text-sm text-zinc-500">Documents shared by others will appear here.</p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sharedDocuments.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={openingId === doc.id}
                    onClick={() => { setOpeningId(doc.id); router.push(`/documents/${doc.id}`); }}
                    className="flex items-center gap-1.5 truncate text-left text-sm font-semibold text-zinc-900 hover:text-indigo-600 disabled:opacity-60"
                  >
                    {openingId === doc.id && <Spinner />}
                    {doc.title}
                  </button>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Shared by {doc.owner_email} · Updated {formatDate(doc.updated_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    doc.permission === "edit"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
                  }`}
                >
                  {doc.permission === "edit" ? "Can edit" : "View only"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {shareTarget && (
        <ShareDialog
          documentId={shareTarget.id}
          documentTitle={shareTarget.title}
          onClose={() => {
            setShareTarget(null);
            router.refresh();
          }}
        />
      )}
      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
