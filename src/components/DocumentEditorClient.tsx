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
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-indigo-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="mx-1 h-4 w-px bg-zinc-200" />
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
              className="min-w-0 flex-1 rounded-lg border border-indigo-300 px-2 py-1 text-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
            />
          ) : (
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => {
                setRenameValue(title);
                setRenaming(true);
              }}
              className={`truncate text-lg font-semibold tracking-tight text-zinc-900 ${
                isOwner ? "hover:text-indigo-600" : "cursor-default"
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>

      {!isOwner && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <span>
            {ownerEmail ? `Shared by ${ownerEmail}` : "Shared with you"} ·{" "}
            <span className={canEdit ? "font-medium text-emerald-700" : "font-medium"}>
              {canEdit ? "you can edit this document" : "view-only access"}
            </span>
          </span>
        </div>
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
    return (
      <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
        View only
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Saved
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-xs text-red-600">{error ?? "Failed to save"}</span>;
  }
  return <span className="text-xs text-zinc-400">Up to date</span>;
}
