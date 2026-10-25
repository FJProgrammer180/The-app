export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content_md: string;
          cover_image_url: string | null;
          hero_media_url: string | null;
          tags: string[];
          status: "draft" | "published";
          published_at: string | null;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content_md: string;
          cover_image_url?: string | null;
          hero_media_url?: string | null;
          tags?: string[];
          status?: "draft" | "published";
          published_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          excerpt?: string | null;
          content_md?: string;
          cover_image_url?: string | null;
          hero_media_url?: string | null;
          tags?: string[];
          status?: "draft" | "published";
          published_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          title: string;
          slug: string;
          summary: string | null;
          description: string | null;
          cover_image_url: string | null;
          technologies: string[];
          demo_url: string | null;
          repository_url: string | null;
          is_published: boolean;
          featured_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          summary?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          technologies?: string[];
          demo_url?: string | null;
          repository_url?: string | null;
          is_published?: boolean;
          featured_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          summary?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          technologies?: string[];
          demo_url?: string | null;
          repository_url?: string | null;
          is_published?: boolean;
          featured_order?: number;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          value: unknown;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: unknown;
          updated_at?: string;
        };
        Update: {
          value?: unknown;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
