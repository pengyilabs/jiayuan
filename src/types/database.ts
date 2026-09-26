export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          at: string;
          detail: NonNullable<Json>;
          from_status: Database['public']['Enums']['post_status'] | null;
          id: number;
          post_id: number | null;
          to_status: Database['public']['Enums']['post_status'] | null;
          undoes: number | null;
          undone_at: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          at?: string;
          detail?: NonNullable<Json>;
          from_status?: Database['public']['Enums']['post_status'] | null;
          id?: never;
          post_id?: number | null;
          to_status?: Database['public']['Enums']['post_status'] | null;
          undoes?: number | null;
          undone_at?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          at?: string;
          detail?: NonNullable<Json>;
          from_status?: Database['public']['Enums']['post_status'] | null;
          id?: never;
          post_id?: number | null;
          to_status?: Database['public']['Enums']['post_status'] | null;
          undoes?: number | null;
          undone_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey';
            columns: ['actor_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_post_id_fkey';
            columns: ['post_id'];
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_undoes_fkey';
            columns: ['undoes'];
            referencedRelation: 'audit_log';
            referencedColumns: ['id'];
          },
        ];
      };
      listing_media: {
        Row: {
          id: number;
          kind: Database['public']['Enums']['media_kind'];
          listing_id: number;
          path: string;
          position: number;
        };
        Insert: {
          id?: never;
          kind?: Database['public']['Enums']['media_kind'];
          listing_id: number;
          path: string;
          position?: number;
        };
        Update: {
          id?: never;
          kind?: Database['public']['Enums']['media_kind'];
          listing_id?: number;
          path?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'listing_media_listing_id_fkey';
            columns: ['listing_id'];
            referencedRelation: 'listings';
            referencedColumns: ['id'];
          },
        ];
      };
      listings: {
        Row: {
          address: string;
          amenities: string[];
          area_sqft: number | null;
          baths: number;
          beds: number;
          centris_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          deleted_at: string | null;
          description: NonNullable<Json>;
          id: number;
          price: number;
          property_type: Database['public']['Enums']['property_type'];
          status: Database['public']['Enums']['listing_status'];
          title: NonNullable<Json>;
          updated_at: string;
        };
        Insert: {
          address: string;
          amenities?: string[];
          area_sqft?: number | null;
          baths?: number;
          beds?: number;
          centris_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          deleted_at?: string | null;
          description?: NonNullable<Json>;
          id?: never;
          price: number;
          property_type: Database['public']['Enums']['property_type'];
          status?: Database['public']['Enums']['listing_status'];
          title: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          address?: string;
          amenities?: string[];
          area_sqft?: number | null;
          baths?: number;
          beds?: number;
          centris_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          deleted_at?: string | null;
          description?: NonNullable<Json>;
          id?: never;
          price?: number;
          property_type?: Database['public']['Enums']['property_type'];
          status?: Database['public']['Enums']['listing_status'];
          title?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'listings_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: number;
          payload: NonNullable<Json>;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_settings: {
        Row: {
          deleted_retention_days: number;
          id: boolean;
          name: string;
          require_admin_mfa: boolean;
          timezone: string;
          undo_window_seconds: number;
          updated_at: string;
        };
        Insert: {
          deleted_retention_days?: number;
          id?: boolean;
          name?: string;
          require_admin_mfa?: boolean;
          timezone?: string;
          undo_window_seconds?: number;
          updated_at?: string;
        };
        Update: {
          deleted_retention_days?: number;
          id?: boolean;
          name?: string;
          require_admin_mfa?: boolean;
          timezone?: string;
          undo_window_seconds?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      platforms: {
        Row: {
          account_label: string;
          color: string;
          connected: boolean;
          description: NonNullable<Json>;
          id: string;
          name: NonNullable<Json>;
          note: Json | null;
          publish_mode: Database['public']['Enums']['publish_mode'];
          sort_order: number;
        };
        Insert: {
          account_label?: string;
          color: string;
          connected?: boolean;
          description?: NonNullable<Json>;
          id: string;
          name: NonNullable<Json>;
          note?: Json | null;
          publish_mode?: Database['public']['Enums']['publish_mode'];
          sort_order?: number;
        };
        Update: {
          account_label?: string;
          color?: string;
          connected?: boolean;
          description?: NonNullable<Json>;
          id?: string;
          name?: NonNullable<Json>;
          note?: Json | null;
          publish_mode?: Database['public']['Enums']['publish_mode'];
          sort_order?: number;
        };
        Relationships: [];
      };
      post_media: {
        Row: {
          id: number;
          kind: Database['public']['Enums']['media_kind'];
          path: string;
          position: number;
          post_id: number;
        };
        Insert: {
          id?: never;
          kind?: Database['public']['Enums']['media_kind'];
          path: string;
          position?: number;
          post_id: number;
        };
        Update: {
          id?: never;
          kind?: Database['public']['Enums']['media_kind'];
          path?: string;
          position?: number;
          post_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'post_media_post_id_fkey';
            columns: ['post_id'];
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      post_type_group_platforms: {
        Row: {
          group_id: string;
          platform_id: string;
        };
        Insert: {
          group_id: string;
          platform_id: string;
        };
        Update: {
          group_id?: string;
          platform_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_type_group_platforms_group_id_fkey';
            columns: ['group_id'];
            referencedRelation: 'post_type_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_type_group_platforms_platform_id_fkey';
            columns: ['platform_id'];
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          },
        ];
      };
      post_type_groups: {
        Row: {
          description: NonNullable<Json>;
          id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          description?: NonNullable<Json>;
          id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          description?: NonNullable<Json>;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      post_types: {
        Row: {
          aspect_ratios: string[] | null;
          format_group: string;
          id: string;
          max_chars: number | null;
          max_duration_seconds: number | null;
          max_media: number | null;
          name: NonNullable<Json>;
          platform_id: string;
          ratio_label: string;
          sort_order: number;
        };
        Insert: {
          aspect_ratios?: string[] | null;
          format_group: string;
          id: string;
          max_chars?: number | null;
          max_duration_seconds?: number | null;
          max_media?: number | null;
          name: NonNullable<Json>;
          platform_id: string;
          ratio_label?: string;
          sort_order?: number;
        };
        Update: {
          aspect_ratios?: string[] | null;
          format_group?: string;
          id?: string;
          max_chars?: number | null;
          max_duration_seconds?: number | null;
          max_media?: number | null;
          name?: NonNullable<Json>;
          platform_id?: string;
          ratio_label?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'post_types_platform_id_fkey';
            columns: ['platform_id'];
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          author_id: string;
          baths?: number | null;
          beds?: number | null;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          external_url?: string | null;
          format?: Database['public']['Enums']['post_format'];
          hashtags?: string;
          id?: never;
          lang?: Database['public']['Enums']['content_lang'];
          listing_id?: number | null;
          platform_id: string;
          post_type_id?: string | null;
          price?: number | null;
          published_at?: string | null;
          rejection_reason?: string | null;
          scheduled_at: string;
          status?: Database['public']['Enums']['post_status'];
          template_id?: number | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          author_id?: string;
          baths?: number | null;
          beds?: number | null;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          external_url?: string | null;
          format?: Database['public']['Enums']['post_format'];
          hashtags?: string;
          id?: never;
          lang?: Database['public']['Enums']['content_lang'];
          listing_id?: number | null;
          platform_id?: string;
          post_type_id?: string | null;
          price?: number | null;
          published_at?: string | null;
          rejection_reason?: string | null;
          scheduled_at?: string;
          status?: Database['public']['Enums']['post_status'];
          template_id?: number | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_approved_by_fkey';
            columns: ['approved_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_listing_id_fkey';
            columns: ['listing_id'];
            referencedRelation: 'listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_platform_id_fkey';
            columns: ['platform_id'];
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_platform_id_post_type_id_fkey';
            columns: ['platform_id', 'post_type_id'];
            referencedRelation: 'post_types';
            referencedColumns: ['platform_id', 'id'];
          },
          {
            foreignKeyName: 'posts_template_id_fkey';
            columns: ['template_id'];
            referencedRelation: 'templates';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          avatar_url: string | null;
          confirmed_at: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          invited_at: string | null;
          last_sign_in_at: string | null;
          locale: string;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
          username: string;
        };
        Insert: {
          active?: boolean;
          avatar_url?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          invited_at?: string | null;
          last_sign_in_at?: string | null;
          locale?: string;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
          username: string;
        };
        Update: {
          active?: boolean;
          avatar_url?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          invited_at?: string | null;
          last_sign_in_at?: string | null;
          locale?: string;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      publish_attempts: {
        Row: {
          at: string;
          id: number;
          job_id: number;
          outcome: string;
          summary: NonNullable<Json>;
        };
        Insert: {
          at?: string;
          id?: never;
          job_id: number;
          outcome: string;
          summary?: NonNullable<Json>;
        };
        Update: {
          at?: string;
          id?: never;
          job_id?: number;
          outcome?: string;
          summary?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'publish_attempts_job_id_fkey';
            columns: ['job_id'];
            referencedRelation: 'publish_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      publish_jobs: {
        Row: {
          attempts: number;
          created_at: string;
          error: string | null;
          external_post_id: string | null;
          external_url: string | null;
          id: number;
          idempotency_key: string;
          next_attempt_at: string | null;
          platform_id: string;
          post_id: number;
          run_at: string;
          status: Database['public']['Enums']['publish_job_status'];
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          error?: string | null;
          external_post_id?: string | null;
          external_url?: string | null;
          id?: never;
          idempotency_key: string;
          next_attempt_at?: string | null;
          platform_id: string;
          post_id: number;
          run_at: string;
          status?: Database['public']['Enums']['publish_job_status'];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          error?: string | null;
          external_post_id?: string | null;
          external_url?: string | null;
          id?: never;
          idempotency_key?: string;
          next_attempt_at?: string | null;
          platform_id?: string;
          post_id?: number;
          run_at?: string;
          status?: Database['public']['Enums']['publish_job_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'publish_jobs_platform_id_fkey';
            columns: ['platform_id'];
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'publish_jobs_post_id_fkey';
            columns: ['post_id'];
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      sign_in_attempts: {
        Row: {
          at: string;
          id: number;
          ip: string | null;
          key: string;
          success: boolean;
        };
        Insert: {
          at?: string;
          id?: never;
          ip?: string | null;
          key: string;
          success: boolean;
        };
        Update: {
          at?: string;
          id?: never;
          ip?: string | null;
          key?: string;
          success?: boolean;
        };
        Relationships: [];
      };
      social_accounts: {
        Row: {
          created_at: string;
          display_name: string;
          expires_at: string | null;
          external_account_id: string;
          id: number;
          platform_id: string;
          scopes: string[];
          secret_id: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          expires_at?: string | null;
          external_account_id: string;
          id?: never;
          platform_id: string;
          scopes?: string[];
          secret_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          expires_at?: string | null;
          external_account_id?: string;
          id?: never;
          platform_id?: string;
          scopes?: string[];
          secret_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'social_accounts_platform_id_fkey';
            columns: ['platform_id'];
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          },
        ];
      };
      template_variants: {
        Row: {
          height: number;
          id: number;
          platform_id: string;
          post_type_id: string;
          slots: NonNullable<Json>;
          template_id: number;
          width: number;
        };
        Insert: {
          height: number;
          id?: never;
          platform_id: string;
          post_type_id: string;
          slots?: NonNullable<Json>;
          template_id: number;
          width: number;
        };
        Update: {
          height?: number;
          id?: never;
          platform_id?: string;
          post_type_id?: string;
          slots?: NonNullable<Json>;
          template_id?: number;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'template_variants_platform_id_post_type_id_fkey';
            columns: ['platform_id', 'post_type_id'];
            referencedRelation: 'post_types';
            referencedColumns: ['platform_id', 'id'];
          },
          {
            foreignKeyName: 'template_variants_template_id_fkey';
            columns: ['template_id'];
            referencedRelation: 'templates';
            referencedColumns: ['id'];
          },
        ];
      };
      templates: {
        Row: {
          color: string;
          description: NonNullable<Json>;
          id: number;
          lang_label: string;
          layout: string;
          name_key: string;
          platform_tags: string[];
          scene: string;
        };
        Insert: {
          color: string;
          description?: NonNullable<Json>;
          id?: never;
          lang_label: string;
          layout: string;
          name_key: string;
          platform_tags?: string[];
          scene: string;
        };
        Update: {
          color?: string;
          description?: NonNullable<Json>;
          id?: never;
          lang_label?: string;
          layout?: string;
          name_key?: string;
          platform_tags?: string[];
          scene?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _notify: {
        Args: { p_payload: Json; p_type: string; p_user_id: string };
        Returns: undefined;
      };
      _post_for_update: {
        Args: { p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      _require_admin: { Args: Record<PropertyKey, never>; Returns: undefined };
      _require_member: { Args: Record<PropertyKey, never>; Returns: undefined };
      approve_post: {
        Args: { p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_valid_post_transition: {
        Args: {
          p_from: Database['public']['Enums']['post_status'];
          p_to: Database['public']['Enums']['post_status'];
        };
        Returns: boolean;
      };
      mark_published: {
        Args: { p_external_url?: string; p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      post_undo_snapshot: { Args: { p: Json }; Returns: Json };
      purge_deleted_posts: { Args: Record<PropertyKey, never>; Returns: number };
      purge_sign_in_attempts: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      record_sign_in_attempt: {
        Args: { p_ip: string; p_key: string; p_success: boolean };
        Returns: undefined;
      };
      reject_post: {
        Args: { p_post_id: number; p_reason: string };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reopen_post: {
        Args: { p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_post: {
        Args: { p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_user_active: {
        Args: { p_active: boolean; p_user_id: string };
        Returns: {
          active: boolean;
          avatar_url: string | null;
          confirmed_at: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          invited_at: string | null;
          last_sign_in_at: string | null;
          locale: string;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
          username: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_user_role: {
        Args: {
          p_role: Database['public']['Enums']['user_role'];
          p_user_id: string;
        };
        Returns: {
          active: boolean;
          avatar_url: string | null;
          confirmed_at: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          invited_at: string | null;
          last_sign_in_at: string | null;
          locale: string;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
          username: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      sign_in_allowed: {
        Args: { p_ip?: string; p_key: string };
        Returns: boolean;
      };
      soft_delete_post: {
        Args: { p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_post: {
        Args: { p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      undo_action: {
        Args: { p_audit_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      withdraw_post: {
        Args: { p_post_id: number };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          author_id: string;
          baths: number | null;
          beds: number | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          external_url: string | null;
          format: Database['public']['Enums']['post_format'];
          hashtags: string;
          id: number;
          lang: Database['public']['Enums']['content_lang'];
          listing_id: number | null;
          platform_id: string;
          post_type_id: string | null;
          price: number | null;
          published_at: string | null;
          rejection_reason: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['post_status'];
          template_id: number | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      content_lang: 'zh' | 'en' | 'fr' | 'bilingual';
      listing_status: 'for_sale' | 'sold' | 'for_rent' | 'rented' | 'off';
      media_kind: 'image' | 'video';
      post_format: 'single' | 'carousel' | 'video';
      post_status:
        'draft' | 'pending' | 'approved' | 'publishing' | 'published' | 'failed' | 'rejected';
      property_type: 'apartment' | 'villa' | 'commercial';
      publish_job_status: 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled';
      publish_mode: 'manual' | 'api';
      user_role: 'employee' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      content_lang: ['zh', 'en', 'fr', 'bilingual'],
      listing_status: ['for_sale', 'sold', 'for_rent', 'rented', 'off'],
      media_kind: ['image', 'video'],
      post_format: ['single', 'carousel', 'video'],
      post_status: [
        'draft',
        'pending',
        'approved',
        'publishing',
        'published',
        'failed',
        'rejected',
      ],
      property_type: ['apartment', 'villa', 'commercial'],
      publish_job_status: ['queued', 'publishing', 'published', 'failed', 'cancelled'],
      publish_mode: ['manual', 'api'],
      user_role: ['employee', 'admin'],
    },
  },
} as const;
