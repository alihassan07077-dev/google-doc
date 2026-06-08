"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { ShareDialog } from "@/components/ShareDialog";
import type { DocumentRow } from "@/lib/supabase/types";

interface DocumentEditorClientProps {
  document: DocumentRow;
  isOwner: boolean;
  canEdit: boolean;
  ownerEmail: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;

export function DocumentEditorClient({ document, isOwner, canEdit, ownerEmail }: DocumentEditorClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(document.title);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(document.title);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<JSONContent | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const persistContent = useCallback(
    async (content: JSONContent) => {
      setSaveStatus("saving");
      setSaveError(null);

      const { error } = await supabase
        .from("documents")
        .update({ content })
        .eq("id", document.id);

      if (error) {
        setSaveStatus("error");
        setSaveError(error.message);
        return;
      }
      setSaveStatus("saved");
    },
    [document.id, supabase],
  );

  function handleEditorChange(content: JSONContent) {
    latestContentRef.current = content;
    setSaveStatus("saving");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (latestContentRef.current) {
        persistContent(latestContentRef.current);
      }
    }, AUTOSAVE_DELAY_MS);
  }

  async function commitRename() {
    const trimmed = renameValue.trim();
    setRenaming(false);

    if (!trimmed || trimmed === title) {
      setRenameValue(title);
      return;
    }

    const { error } = await supabase.from("documents").update({ title: trimmed }).eq("id", document.id);
    if (error) {
      setSaveError(error.message);
      setRenameValue(title);
      return;
    }
    setTitle(trimmed);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/dashboard" className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900">
            ← Back
          </Link>
          {renaming && isOwner ? (
            <input
              aria-label="Document title"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setRenameValue(title);
                  setRenaming(false);
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xl font-semibold outline-none focus:border-zinc-500"
            />
          ) : (
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => {
                setRenameValue(title);
                setRenaming(true);
              }}
              className={`truncate text-xl font-semibold tracking-tight text-zinc-900 ${
                isOwner ? "hover:underline" : "cursor-default"
              }`}
              title={isOwner ? "Click to rename" : undefined}
            >
              {title}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <SaveIndicator status={saveStatus} error={saveError} canEdit={canEdit} />
          {isOwner && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Share
            </button>
          )}
        </div>
      </div>

      {!isOwner && (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
          {ownerEmail ? `Shared by ${ownerEmail}` : "Shared with you"} ·{" "}
          {canEdit ? "you can edit this document" : "you have view-only access"}
        </p>
      )}

      <RichTextEditor initialContent={document.content} editable={canEdit} onChange={handleEditorChange} />

      {shareOpen && (
        <ShareDialog documentId={document.id} documentTitle={title} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

function SaveIndicator({ status, error, canEdit }: { status: SaveStatus; error: string | null; canEdit: boolean }) {
  if (!canEdit) {
    return <span className="text-sm text-zinc-400">View only</span>;
  }
  if (status === "saving") return <span className="text-sm text-zinc-400">Saving…</span>;
  if (status === "saved") return <span className="text-sm text-emerald-600">Saved</span>;
  if (status === "error") {
    return <span className="text-sm text-red-600">{error ?? "Failed to save"}</span>;
  }
  return <span className="text-sm text-zinc-400">Up to date</span>;
}
