import type { JSONContent } from "@tiptap/react";

/**
 * Converts a small, pragmatic subset of Markdown into Tiptap's JSON document
 * format: headings (#–######), bullet/numbered lists, bold (**) and italic (*),
 * with everything else falling back to plain paragraphs. This intentionally
 * does not aim to be a full CommonMark parser — it covers the formatting the
 * editor itself supports, which is what matters for round-tripping an import
 * into something the user can keep editing.
 */
export function markdownToTiptap(markdown: string): JSONContent {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const content: JSONContent[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      content.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: parseInline(heading[2]),
      });
      i++;
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^[-*+]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      content.push(buildList("bulletList", items));
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^\d+[.)]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      content.push(buildList("orderedList", items));
      continue;
    }

    // Plain paragraph — gather contiguous non-empty, non-special lines.
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+[.)]\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    content.push({
      type: "paragraph",
      content: parseInline(paragraphLines.join(" ")),
    });
  }

  if (content.length === 0) {
    content.push({ type: "paragraph" });
  }

  return { type: "doc", content };
}

function buildList(type: "bulletList" | "orderedList", items: string[]): JSONContent {
  return {
    type,
    content: items.map((item) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: parseInline(item) }],
    })),
  };
}

/**
 * Parses a single line of inline Markdown into Tiptap text nodes, handling
 * **bold** and *italic* (non-overlapping, non-nested — sufficient for typical
 * imported notes).
 */
function parseInline(text: string): JSONContent[] {
  if (text === "") return [];

  const nodes: JSONContent[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    if (match[2] !== undefined) {
      nodes.push({ type: "text", marks: [{ type: "bold" }], text: match[2] });
    } else if (match[3] !== undefined) {
      nodes.push({ type: "text", marks: [{ type: "italic" }], text: match[3] });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

/** Wraps plain text (e.g. an uploaded .txt file) as Tiptap paragraphs, one per line. */
export function plainTextToTiptap(text: string): JSONContent {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const content: JSONContent[] = lines
    .filter((line) => line.trim() !== "")
    .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] }));

  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}
