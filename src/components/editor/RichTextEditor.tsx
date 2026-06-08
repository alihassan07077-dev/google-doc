"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { Toolbar } from "./Toolbar";

interface RichTextEditorProps {
  initialContent: JSONContent;
  editable: boolean;
  onChange?: (content: JSONContent) => void;
}

export function RichTextEditor({ initialContent, editable, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: editable ? "Start writing…" : "This document is empty.",
      }),
    ],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc max-w-none px-6 py-4 min-h-[60vh] focus:outline-none prose-headings:font-semibold",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  // Keep `editable` in sync if it changes after the editor mounts (e.g. permission loads async).
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <Toolbar editor={editor} readOnly={!editable} />
      <EditorContent editor={editor} />
    </div>
  );
}
