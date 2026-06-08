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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Upload a file"
      >
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">Upload a document</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Upload a <code>.txt</code> or <code>.md</code> file (max 1 MB) and we&apos;ll turn it
          into a new editable document. Markdown headings, bold, italic, and lists are converted
          to rich-text formatting.
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
          className="flex w-full flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-zinc-300 px-4 py-8 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
        >
          {status === "loading" ? (
            <>
              <svg
                className="h-6 w-6 animate-spin text-zinc-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg
                className="h-6 w-6 text-zinc-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Click to choose a file
            </>
          )}
        </button>

        {error && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
