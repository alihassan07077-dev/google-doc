import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { DashboardClient } from "@/components/DashboardClient";
import type { DocumentRow, SharedDocumentWithOwner } from "@/lib/supabase/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [ownedResult, sharedResult] = await Promise.all([
    supabase
      .from("documents")
      .select("id, owner_id, title, content, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.rpc("shared_documents_with_owner"),
  ]);

  const owned = (ownedResult.data ?? []) as DocumentRow[];
  const shared = (sharedResult.data ?? []) as SharedDocumentWithOwner[];

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <DashboardClient
          ownedDocuments={owned}
          sharedDocuments={shared}
          loadError={ownedResult.error?.message ?? sharedResult.error?.message ?? null}
        />
      </main>
    </div>
  );
}
