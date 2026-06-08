"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface UploadDialogProps {
  onClose: () => void;
}

const ACCEPTED_EXTENSIONS = [".txt", ".md"];
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

export function UploadDialog({ onClose }: UploadDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    const lowerName = file.name.toLowerCase();
    const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    if (!hasAcceptedExtension) {
      return `Unsupported file type. Only ${ACCEPTED_EXTENSIONS.join(" and ")} files are supported.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. The limit is 1 MB.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setStatus("error");
      setError(validationError);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(result.error ?? "Upload failed. Please try again.");
        return;
      }

      router.push(`/documents/${result.id}`);
      router.refresh();
    } catch {
      setStatus("error");
      setError("Something went wrong while uploading. Please try again.");
    }
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
        aria-label="Upload a file"
      >
        {/* Dialog header */}
        <div className="border-b border-zinc-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Upload a document</h2>
              <p className="text-xs text-zinc-500">.txt or .md · max 1 MB</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-zinc-500">
            Markdown headings, bold, italic, and lists are converted to rich-text formatting.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "loading"}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-10 text-sm font-medium text-zinc-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <svg
                  className="h-8 w-8 animate-spin text-indigo-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-indigo-600 font-semibold">Uploading…</span>
              </>
            ) : (
              <>
                <svg
                  className="h-8 w-8 text-indigo-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-indigo-600 font-semibold">Click to choose a file</span>
                <span className="text-xs text-zinc-400">.txt or .md · max 1 MB</span>
              </>
            )}
          </button>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
