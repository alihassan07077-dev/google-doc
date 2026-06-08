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
          className="w-full rounded-md border-2 border-dashed border-zinc-300 px-4 py-8 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
        >
          {status === "loading" ? "Uploading…" : "Click to choose a file"}
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
