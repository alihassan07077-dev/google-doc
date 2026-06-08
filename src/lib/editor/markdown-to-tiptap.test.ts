import { describe, expect, it } from "vitest";
import { markdownToTiptap, plainTextToTiptap } from "./markdown-to-tiptap";

describe("markdownToTiptap", () => {
  it("converts headings to heading nodes with the correct level", () => {
    const result = markdownToTiptap("# Title\n## Subtitle");

    expect(result.content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Title" }],
    });
    expect(result.content?.[1]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Subtitle" }],
    });
  });

  it("converts bold and italic inline syntax into marked text nodes", () => {
    const result = markdownToTiptap("This is **bold** and *italic* text.");
    const paragraph = result.content?.[0];

    expect(paragraph?.type).toBe("paragraph");
    expect(paragraph?.content).toEqual([
      { type: "text", text: "This is " },
      { type: "text", marks: [{ type: "bold" }], text: "bold" },
      { type: "text", text: " and " },
      { type: "text", marks: [{ type: "italic" }], text: "italic" },
      { type: "text", text: " text." },
    ]);
  });

  it("groups consecutive bullet lines into a single bulletList with listItems", () => {
    const result = markdownToTiptap("- First\n- Second\n- Third");
    const list = result.content?.[0];

    expect(list?.type).toBe("bulletList");
    expect(list?.content).toHaveLength(3);
    expect(list?.content?.[0]).toMatchObject({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }],
    });
  });

  it("groups consecutive numbered lines into a single orderedList", () => {
    const result = markdownToTiptap("1. One\n2. Two");
    const list = result.content?.[0];

    expect(list?.type).toBe("orderedList");
    expect(list?.content).toHaveLength(2);
  });

  it("falls back to a single empty paragraph for empty input", () => {
    const result = markdownToTiptap("   \n\n  ");
    expect(result).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("plainTextToTiptap", () => {
  it("wraps each non-empty line in its own paragraph", () => {
    const result = plainTextToTiptap("Line one\n\nLine two");

    expect(result).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Line one" }] },
        { type: "paragraph", content: [{ type: "text", text: "Line two" }] },
      ],
    });
  });

  it("returns a single empty paragraph for blank input", () => {
    expect(plainTextToTiptap("   ")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });
});
