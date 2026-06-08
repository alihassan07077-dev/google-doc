"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Permission } from "@/lib/supabase/types";

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

export function ShareDialog({ documentId, documentTitle, onClose }: ShareDialogProps) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("edit");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus("error");
      setMessage("Enter an email address to share with.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && trimmedEmail.toLowerCase() === user.email?.toLowerCase()) {
      setStatus("error");
      setMessage("You already own this document.");
      return;
    }

    const { data: targetUserId, error: lookupError } = await supabase.rpc(
      "find_user_id_by_email",
      { lookup_email: trimmedEmail },
    );

    if (lookupError) {
      setStatus("error");
      setMessage(lookupError.message);
      return;
    }

    if (!targetUserId) {
      setStatus("error");
      setMessage(`No account found for "${trimmedEmail}". They need to sign up first.`);
      return;
    }

    const { error: insertError } = await supabase.from("document_shares").upsert(
      {
        document_id: documentId,
        shared_with_user_id: targetUserId,
        permission,
      },
      { onConflict: "document_id,shared_with_user_id" },
    );

    if (insertError) {
      setStatus("error");
      setMessage(insertError.message);
      return;
    }

    setStatus("success");
    setMessage(`Shared "${documentTitle}" with ${trimmedEmail} (${permission} access).`);
    setEmail("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${documentTitle}`}
      >
        {/* Dialog header */}
        <div className="border-b border-zinc-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-900">Share document</h2>
              <p className="truncate text-xs text-zinc-500">&ldquo;{documentTitle}&rdquo;</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="share-email" className="text-sm font-medium text-zinc-700">
                Collaborator&apos;s email
              </label>
              <input
                id="share-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-zinc-700">Access level</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["edit", "view"] as Permission[]).map((p) => (
                  <label
                    key={p}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm transition-colors ${
                      permission === p
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="permission"
                      className="sr-only"
                      checked={permission === p}
                      onChange={() => setPermission(p)}
                    />
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      {p === "edit" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      )}
                    </svg>
                    <span className="font-medium">{p === "edit" ? "Can edit" : "Can view"}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {message && (
              <p
                role="status"
                className={`rounded-lg px-3 py-2 text-sm ${
                  status === "error"
                    ? "border border-red-100 bg-red-50 text-red-700"
                    : "border border-emerald-100 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-60"
              >
                {status === "loading" && (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {status === "loading" ? "Sharing…" : "Share"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
