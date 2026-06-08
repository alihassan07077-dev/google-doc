import type { JSONContent } from "@tiptap/react";

export type Permission = "view" | "edit";

export type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  content: JSONContent;
  created_at: string;
  updated_at: string;
};

export type DocumentShareRow = {
  id: string;
  document_id: string;
  shared_with_user_id: string;
  permission: Permission;
  created_at: string;
};

export type SharedDocumentWithOwner = {
  id: string;
  title: string;
  content: JSONContent;
  updated_at: string;
  owner_id: string;
  owner_email: string;
  permission: Permission;
};

// Minimal hand-written schema for the Supabase typed client.
// (We don't run `supabase gen types` here since the project is provisioned
// by the reviewer; this mirrors supabase/migrations/0001_init.sql.)
export type Database = {
  public: {
    Tables: {
      documents: {
        Row: DocumentRow;
        Insert: Partial<DocumentRow> & { owner_id: string };
        Update: Partial<DocumentRow>;
        Relationships: [];
      };
      document_shares: {
        Row: DocumentShareRow;
        Insert: Partial<DocumentShareRow> & {
          document_id: string;
          shared_with_user_id: string;
        };
        Update: Partial<DocumentShareRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      find_user_id_by_email: {
        Args: { lookup_email: string };
        Returns: string;
      };
      shared_documents_with_owner: {
        Args: Record<PropertyKey, never>;
        Returns: SharedDocumentWithOwner[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
