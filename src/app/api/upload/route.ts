import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markdownToTiptap, plainTextToTiptap } from "@/lib/editor/markdown-to-tiptap";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const ALLOWED_EXTENSIONS = [".txt", ".md"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to upload a file." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }

  const lowerName = file.name.toLowerCase();
  const extension = ALLOWED_EXTENSIONS.find((ext) => lowerName.endsWith(ext));

  if (!extension) {
    return NextResponse.json(
      { error: `Unsupported file type. Only ${ALLOWED_EXTENSIONS.join(" and ")} files are supported.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large. The limit is 1 MB." }, { status: 400 });
  }

  const text = await file.text();
  const content = extension === ".md" ? markdownToTiptap(text) : plainTextToTiptap(text);
  const title = file.name.replace(/\.(txt|md)$/i, "") || "Untitled document";

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title, content })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create the document." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
