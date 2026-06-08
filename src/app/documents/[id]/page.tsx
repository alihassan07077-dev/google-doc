import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { DocumentEditorClient } from "@/components/DocumentEditorClient";
import type { DocumentRow } from "@/lib/supabase/types";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, owner_id, title, content, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !document) notFound();

  const doc = document as DocumentRow;
  const isOwner = doc.owner_id === user.id;

  let canEdit = isOwner;
  let ownerEmail: string | null = null;

  if (!isOwner) {
    const { data: shared } = await supabase.rpc("shared_documents_with_owner");
    const match = shared?.find((row) => row.id === doc.id);
    canEdit = match?.permission === "edit";
    ownerEmail = match?.owner_email ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <DocumentEditorClient
          document={doc}
          isOwner={isOwner}
          canEdit={canEdit}
          ownerEmail={ownerEmail}
        />
      </main>
    </div>
  );
}
