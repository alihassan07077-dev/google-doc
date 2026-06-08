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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${documentTitle}`}
      >
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">Share &ldquo;{documentTitle}&rdquo;</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Grant another account access to this document by email.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              placeholder="bob@test.com"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-zinc-700">Access level</legend>
            <div className="flex gap-4 text-sm text-zinc-700">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="permission"
                  checked={permission === "edit"}
                  onChange={() => setPermission("edit")}
                />
                Can edit
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="permission"
                  checked={permission === "view"}
                  onChange={() => setPermission("view")}
                />
                Can view
              </label>
            </div>
          </fieldset>

          {message && (
            <p
              role="status"
              className={`rounded-md px-3 py-2 text-sm ${
                status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {status === "loading" ? "Sharing…" : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
