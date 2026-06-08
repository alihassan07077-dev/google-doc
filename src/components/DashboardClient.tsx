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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Your documents</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Upload file
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {creating ? "Creating…" : "New document"}
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          My documents · owned by you
        </h2>
        {ownedDocuments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500">
            You don&apos;t have any documents yet. Create one or upload a file to get started.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {ownedDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
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
                      className="w-full max-w-sm rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="truncate text-left text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {doc.title}
                    </button>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-500">Updated {formatDate(doc.updated_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startRename(doc)}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareTarget({ id: doc.id, title: doc.title })}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === doc.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Shared with me
        </h2>
        {sharedDocuments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500">
            No one has shared a document with you yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {sharedDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="truncate text-left text-sm font-medium text-zinc-900 hover:underline"
                  >
                    {doc.title}
                  </button>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Shared by {doc.owner_email} · Updated {formatDate(doc.updated_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    doc.permission === "edit"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600"
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
