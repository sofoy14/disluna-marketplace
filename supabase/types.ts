export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_policies: {
        Row: {
          applies_to_roles: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          policy_rules: Json
          updated_at: string | null
        }
        Insert: {
          applies_to_roles?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          policy_rules: Json
          updated_at?: string | null
        }
        Update: {
          applies_to_roles?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          policy_rules?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      assistant_collections: {
        Row: {
          assistant_id: string
          collection_id: string
          created_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assistant_id: string
          collection_id: string
          created_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assistant_id?: string
          collection_id?: string
          created_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_collections_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_files: {
        Row: {
          assistant_id: string
          created_at: string
          file_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          file_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          file_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_files_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_tools: {
        Row: {
          assistant_id: string
          created_at: string
          tool_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          tool_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          tool_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_tools_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_workspaces: {
        Row: {
          assistant_id: string
          created_at: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_workspaces_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          context_length: number
          created_at: string
          description: string
          embeddings_provider: string
          id: string
          image_path: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          model: string
          name: string
          prompt: string
          sharing: string
          temperature: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_length: number
          created_at?: string
          description: string
          embeddings_provider: string
          id?: string
          image_path: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          model: string
          name: string
          prompt: string
          sharing?: string
          temperature: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_length?: number
          created_at?: string
          description?: string
          embeddings_provider?: string
          id?: string
          image_path?: string
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          model?: string
          name?: string
          prompt?: string
          sharing?: string
          temperature?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          risk_level: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cag_sessions: {
        Row: {
          created_at: string | null
          decrypted_content: string
          expires_at: string
          id: string
          session_key: string
          user_id: string
          vault_references: string[]
        }
        Insert: {
          created_at?: string | null
          decrypted_content: string
          expires_at: string
          id?: string
          session_key: string
          user_id: string
          vault_references: string[]
        }
        Update: {
          created_at?: string | null
          decrypted_content?: string
          expires_at?: string
          id?: string
          session_key?: string
          user_id?: string
          vault_references?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "cag_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_contexts: {
        Row: {
          cached_sources: Json | null
          chat_id: string
          created_at: string | null
          quality_metrics: Json | null
          search_history: Json | null
          updated_at: string | null
          user_id: string
          user_preferences: Json | null
        }
        Insert: {
          cached_sources?: Json | null
          chat_id: string
          created_at?: string | null
          quality_metrics?: Json | null
          search_history?: Json | null
          updated_at?: string | null
          user_id: string
          user_preferences?: Json | null
        }
        Update: {
          cached_sources?: Json | null
          chat_id?: string
          created_at?: string | null
          quality_metrics?: Json | null
          search_history?: Json | null
          updated_at?: string | null
          user_id?: string
          user_preferences?: Json | null
        }
        Relationships: []
      }
      chat_files: {
        Row: {
          chat_id: string
          created_at: string
          file_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          file_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          file_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_files_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          assistant_id: string | null
          context_length: number
          created_at: string
          embeddings_provider: string
          id: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          model: string
          name: string
          prompt: string
          sharing: string
          temperature: number
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          assistant_id?: string | null
          context_length: number
          created_at?: string
          embeddings_provider: string
          id?: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          model: string
          name: string
          prompt: string
          sharing?: string
          temperature: number
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          assistant_id?: string | null
          context_length?: number
          created_at?: string
          embeddings_provider?: string
          id?: string
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          model?: string
          name?: string
          prompt?: string
          sharing?: string
          temperature?: number
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_files: {
        Row: {
          collection_id: string
          created_at: string
          file_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          file_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          file_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_files_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_workspaces: {
        Row: {
          collection_id: string
          created_at: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_workspaces_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          sharing: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          sharing?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          sharing?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          anonymized_content: string
          content_hash: string
          created_at: string | null
          document_type: string | null
          embedding: string | null
          id: string
          is_approved: boolean | null
          metadata: Json | null
          original_filename: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anonymized_content: string
          content_hash: string
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          original_filename?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anonymized_content?: string
          content_hash?: string
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          original_filename?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_items: {
        Row: {
          content: string
          created_at: string
          file_id: string
          id: string
          local_embedding: string | null
          openai_embedding: string | null
          sharing: string
          tokens: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_id: string
          id?: string
          local_embedding?: string | null
          openai_embedding?: string | null
          sharing?: string
          tokens: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_id?: string
          id?: string
          local_embedding?: string | null
          openai_embedding?: string | null
          sharing?: string
          tokens?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_items_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_workspaces: {
        Row: {
          created_at: string
          file_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_workspaces_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          description: string
          file_path: string
          id: string
          name: string
          sharing: string
          size: number
          tokens: number
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          file_path: string
          id?: string
          name: string
          sharing?: string
          size: number
          tokens: number
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          file_path?: string
          id?: string
          name?: string
          sharing?: string
          size?: number
          tokens?: number
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_in_cents: number
          attempt_count: number | null
          created_at: string | null
          currency: string | null
          id: string
          next_retry_at: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          plan_id: string | null
          reference: string | null
          status: string | null
          subscription_id: string | null
          updated_at: string | null
          wompi_transaction_id: string | null
          workspace_id: string | null
        }
        Insert: {
          amount_in_cents: number
          attempt_count?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          next_retry_at?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          plan_id?: string | null
          reference?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          wompi_transaction_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount_in_cents?: number
          attempt_count?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          next_retry_at?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          plan_id?: string | null
          reference?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          wompi_transaction_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      irreversible_hashes: {
        Row: {
          created_at: string | null
          hash_value: string
          id: string
          pii_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hash_value: string
          id?: string
          pii_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          hash_value?: string
          id?: string
          pii_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "irreversible_hashes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_file_items: {
        Row: {
          created_at: string
          file_item_id: string
          message_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_item_id: string
          message_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_item_id?: string
          message_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_file_items_file_item_id_fkey"
            columns: ["file_item_id"]
            isOneToOne: false
            referencedRelation: "file_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_file_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          assistant_id: string | null
          chat_id: string
          content: string
          created_at: string
          id: string
          image_paths: string[]
          metadata: Json | null
          model: string
          role: string
          sequence_number: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assistant_id?: string | null
          chat_id: string
          content: string
          created_at?: string
          id?: string
          image_paths: string[]
          metadata?: Json | null
          model: string
          role: string
          sequence_number: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assistant_id?: string | null
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          image_paths?: string[]
          metadata?: Json | null
          model?: string
          role?: string
          sequence_number?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      model_limits: {
        Row: {
          created_at: string | null
          id: string
          model_id: string
          model_name: string
          monthly_limit: number
          plan_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id: string
          model_name: string
          monthly_limit: number
          plan_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string
          model_name?: string
          monthly_limit?: number
          plan_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      model_usage: {
        Row: {
          created_at: string | null
          id: string
          model_id: string
          period_end: string
          period_start: string
          updated_at: string | null
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      model_workspaces: {
        Row: {
          created_at: string
          model_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          model_id: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          model_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_workspaces_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          api_key: string
          base_url: string
          context_length: number
          created_at: string
          description: string
          id: string
          model_id: string
          name: string
          sharing: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          base_url: string
          context_length?: number
          created_at?: string
          description: string
          id?: string
          model_id: string
          name: string
          sharing?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          base_url?: string
          context_length?: number
          created_at?: string
          description?: string
          id?: string
          model_id?: string
          name?: string
          sharing?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_sources: {
        Row: {
          brand: string | null
          created_at: string | null
          customer_email: string
          expires_at: string | null
          holder_name: string | null
          id: string
          is_default: boolean | null
          last_four: string | null
          raw_payload: Json | null
          status: string | null
          three_ds_flags: Json | null
          type: string
          updated_at: string | null
          user_id: string
          wompi_id: string
          workspace_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          customer_email: string
          expires_at?: string | null
          holder_name?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          raw_payload?: Json | null
          status?: string | null
          three_ds_flags?: Json | null
          type: string
          updated_at?: string | null
          user_id: string
          wompi_id: string
          workspace_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          customer_email?: string
          expires_at?: string | null
          holder_name?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          raw_payload?: Json | null
          status?: string | null
          three_ds_flags?: Json | null
          type?: string
          updated_at?: string | null
          user_id?: string
          wompi_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_review: {
        Row: {
          content_fragment: string
          created_at: string | null
          detected_pii: Json
          document_id: string | null
          id: string
          priority: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          risk_assessment: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          content_fragment: string
          created_at?: string | null
          detected_pii: Json
          document_id?: string | null
          id?: string
          priority?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk_assessment?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          content_fragment?: string
          created_at?: string | null
          detected_pii?: Json
          document_id?: string | null
          id?: string
          priority?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk_assessment?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_review_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_review_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_review_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pii_vault: {
        Row: {
          access_count: number | null
          created_at: string | null
          encrypted_value: string
          encryption_key_version: number | null
          id: string
          is_revoked: boolean | null
          last_accessed: string | null
          lookup_key: string
          pii_type: string
          risk_level: string | null
          user_id: string
          vault_reference: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          encrypted_value: string
          encryption_key_version?: number | null
          id?: string
          is_revoked?: boolean | null
          last_accessed?: string | null
          lookup_key: string
          pii_type: string
          risk_level?: string | null
          user_id: string
          vault_reference: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          encrypted_value?: string
          encryption_key_version?: number | null
          id?: string
          is_revoked?: boolean | null
          last_accessed?: string | null
          lookup_key?: string
          pii_type?: string
          risk_level?: string | null
          user_id?: string
          vault_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "pii_vault_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          amount_in_cents: number
          billing_period: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          has_multiple_workspaces: boolean | null
          has_processes: boolean | null
          has_transcriptions: boolean | null
          id: string
          is_active: boolean | null
          max_devices: number | null
          max_output_tokens_monthly: number | null
          max_processes: number | null
          max_transcription_hours: number | null
          name: string
          plan_type: string | null
          query_limit: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          amount_in_cents: number
          billing_period?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          has_multiple_workspaces?: boolean | null
          has_processes?: boolean | null
          has_transcriptions?: boolean | null
          id?: string
          is_active?: boolean | null
          max_devices?: number | null
          max_output_tokens_monthly?: number | null
          max_processes?: number | null
          max_transcription_hours?: number | null
          name: string
          plan_type?: string | null
          query_limit?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_in_cents?: number
          billing_period?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          has_multiple_workspaces?: boolean | null
          has_processes?: boolean | null
          has_transcriptions?: boolean | null
          id?: string
          is_active?: boolean | null
          max_devices?: number | null
          max_output_tokens_monthly?: number | null
          max_processes?: number | null
          max_transcription_hours?: number | null
          name?: string
          plan_type?: string | null
          query_limit?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      preset_workspaces: {
        Row: {
          created_at: string
          preset_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          preset_id: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          preset_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preset_workspaces_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preset_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      presets: {
        Row: {
          context_length: number
          created_at: string
          description: string
          embeddings_provider: string
          id: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          model: string
          name: string
          prompt: string
          sharing: string
          temperature: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_length: number
          created_at?: string
          description: string
          embeddings_provider: string
          id?: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          model: string
          name: string
          prompt: string
          sharing?: string
          temperature: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_length?: number
          created_at?: string
          description?: string
          embeddings_provider?: string
          id?: string
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          model?: string
          name?: string
          prompt?: string
          sharing?: string
          temperature?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      process_files: {
        Row: {
          created_at: string
          file_category: string | null
          file_id: string
          file_order: number | null
          notes: string | null
          process_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_category?: string | null
          file_id: string
          file_order?: number | null
          notes?: string | null
          process_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_category?: string | null
          file_id?: string
          file_order?: number | null
          notes?: string | null
          process_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_files_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_workspaces: {
        Row: {
          created_at: string
          process_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          process_id: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          process_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_workspaces_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          client_name: string | null
          created_at: string
          description: string
          end_date: string | null
          id: string
          metadata: Json | null
          name: string
          process_number: string | null
          process_type: string | null
          sharing: string
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          description: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name: string
          process_number?: string | null
          process_type?: string | null
          sharing?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          process_number?: string | null
          process_type?: string | null
          sharing?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string
          created_at: string
          custom_primary_color: string | null
          display_name: string
          email_verification_sent_at: string | null
          email_verified: boolean | null
          has_onboarded: boolean
          id: string
          image_path: string
          image_url: string
          onboarding_completed: boolean | null
          onboarding_step: string | null
          plan_type: string | null
          profile_context: string
          selected_palette: string | null
          selected_shader: number | null
          theme_mode: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          bio: string
          created_at?: string
          custom_primary_color?: string | null
          display_name: string
          email_verification_sent_at?: string | null
          email_verified?: boolean | null
          has_onboarded?: boolean
          id?: string
          image_path: string
          image_url: string
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          plan_type?: string | null
          profile_context: string
          selected_palette?: string | null
          selected_shader?: number | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          bio?: string
          created_at?: string
          custom_primary_color?: string | null
          display_name?: string
          email_verification_sent_at?: string | null
          email_verified?: boolean | null
          has_onboarded?: boolean
          id?: string
          image_path?: string
          image_url?: string
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          plan_type?: string | null
          profile_context?: string
          selected_palette?: string | null
          selected_shader?: number | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      prompt_workspaces: {
        Row: {
          created_at: string
          prompt_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          prompt_id: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          prompt_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_workspaces_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          sharing: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          sharing?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          sharing?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pseudonym_map: {
        Row: {
          created_at: string | null
          id: string
          last_used: string | null
          pii_type: string
          pseudonym: string
          usage_count: number | null
          user_id: string
          vault_reference: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_used?: string | null
          pii_type: string
          pseudonym: string
          usage_count?: number | null
          user_id: string
          vault_reference: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_used?: string | null
          pii_type?: string
          pseudonym?: string
          usage_count?: number | null
          user_id?: string
          vault_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "pseudonym_map_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pseudonym_map_vault_reference_fkey"
            columns: ["vault_reference"]
            isOneToOne: false
            referencedRelation: "pii_vault"
            referencedColumns: ["vault_reference"]
          },
        ]
      }
      special_offers: {
        Row: {
          applies_to: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          name: string
          plan_id: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          name: string
          plan_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          name?: string
          plan_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_offers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_offers: {
        Row: {
          applied_at: string | null
          created_at: string | null
          discount_applied: number
          expires_at: string | null
          id: string
          offer_id: string
          subscription_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          discount_applied: number
          expires_at?: string | null
          id?: string
          offer_id: string
          subscription_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          discount_applied?: number
          expires_at?: string | null
          id?: string
          offer_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "special_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_offers_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_day: number | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          payment_source_id: string | null
          plan_id: string
          status: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
          wompi_reference: string | null
          workspace_id: string
        }
        Insert: {
          billing_day?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          metadata?: Json | null
          payment_source_id?: string | null
          plan_id: string
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
          wompi_reference?: string | null
          workspace_id: string
        }
        Update: {
          billing_day?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          payment_source_id?: string | null
          plan_id?: string
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
          wompi_reference?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_source_id_fkey"
            columns: ["payment_source_id"]
            isOneToOne: false
            referencedRelation: "payment_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_workspaces: {
        Row: {
          created_at: string
          tool_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          tool_id: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          tool_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_workspaces_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          created_at: string
          custom_headers: Json
          description: string
          id: string
          name: string
          schema: Json
          sharing: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_headers?: Json
          description: string
          id?: string
          name: string
          schema?: Json
          sharing?: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_headers?: Json
          description?: string
          id?: string
          name?: string
          schema?: Json
          sharing?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_in_cents: number
          created_at: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          payment_method_type: string | null
          raw_payload: Json | null
          reference: string | null
          response_code: string | null
          status: string
          status_message: string | null
          wompi_id: string
          workspace_id: string
        }
        Insert: {
          amount_in_cents: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          payment_method_type?: string | null
          raw_payload?: Json | null
          reference?: string | null
          response_code?: string | null
          status: string
          status_message?: string | null
          wompi_id: string
          workspace_id: string
        }
        Update: {
          amount_in_cents?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          payment_method_type?: string | null
          raw_payload?: Json | null
          reference?: string | null
          response_code?: string | null
          status?: string
          status_message?: string | null
          wompi_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          audio_format: string | null
          audio_path: string
          created_at: string
          description: string | null
          duration: number | null
          file_size: number
          id: string
          language: string | null
          model: string | null
          name: string
          status: string
          tokens: number | null
          transcript: string | null
          transcription_id: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          audio_format?: string | null
          audio_path: string
          created_at?: string
          description?: string | null
          duration?: number | null
          file_size?: number
          id?: string
          language?: string | null
          model?: string | null
          name: string
          status?: string
          tokens?: number | null
          transcript?: string | null
          transcription_id?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          audio_format?: string | null
          audio_path?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          file_size?: number
          id?: string
          language?: string | null
          model?: string | null
          name?: string
          status?: string
          tokens?: number | null
          transcript?: string | null
          transcription_id?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          chat_sessions_count: number | null
          created_at: string | null
          id: string
          input_tokens_used: number | null
          messages_count: number | null
          output_tokens_used: number | null
          period_end: string
          period_start: string
          processes_created: number | null
          subscription_id: string | null
          transcription_seconds_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_sessions_count?: number | null
          created_at?: string | null
          id?: string
          input_tokens_used?: number | null
          messages_count?: number | null
          output_tokens_used?: number | null
          period_end: string
          period_start: string
          processes_created?: number | null
          subscription_id?: string | null
          transcription_seconds_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_sessions_count?: number | null
          created_at?: string | null
          id?: string
          input_tokens_used?: number | null
          messages_count?: number | null
          output_tokens_used?: number | null
          period_end?: string
          period_start?: string
          processes_created?: number | null
          subscription_id?: string | null
          transcription_seconds_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          auth_session_id: string | null
          browser: string | null
          created_at: string | null
          device_fingerprint: string | null
          device_name: string | null
          device_type: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_session_id?: string | null
          browser?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_session_id?: string | null
          browser?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          default_context_length: number
          default_model: string
          default_prompt: string
          default_temperature: number
          description: string
          embeddings_provider: string
          id: string
          image_path: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          instructions: string
          is_home: boolean
          name: string
          sharing: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          default_context_length: number
          default_model: string
          default_prompt: string
          default_temperature: number
          description: string
          embeddings_provider: string
          id?: string
          image_path?: string
          include_profile_context: boolean
          include_workspace_instructions: boolean
          instructions: string
          is_home?: boolean
          name: string
          sharing?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          default_context_length?: number
          default_model?: string
          default_prompt?: string
          default_temperature?: number
          description?: string
          embeddings_provider?: string
          id?: string
          image_path?: string
          include_profile_context?: boolean
          include_workspace_instructions?: boolean
          instructions?: string
          is_home?: boolean
          name?: string
          sharing?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_device_limit: {
        Args: { p_user_id: string }
        Returns: {
          active_sessions_count: number
          can_create_session: boolean
          oldest_session_id: string
        }[]
      }
      check_usage_limits: {
        Args: { p_user_id: string }
        Returns: {
          is_within_limits: boolean
          plan_type: string
          processes_limit: number
          processes_used: number
          tokens_limit: number
          tokens_remaining: number
          tokens_used: number
          transcription_limit_seconds: number
          transcription_seconds_used: number
        }[]
      }
      cleanup_expired_cag_sessions: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      create_duplicate_messages_for_new_chat: {
        Args: { new_chat_id: string; new_user_id: string; old_chat_id: string }
        Returns: undefined
      }
      create_user_session: {
        Args: {
          p_auth_session_id?: string
          p_browser?: string
          p_device_fingerprint?: string
          p_device_name?: string
          p_device_type?: string
          p_force_create?: boolean
          p_ip_address?: unknown
          p_session_token: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          created: boolean
          error_message: string
          removed_session_id: string
          session_id: string
        }[]
      }
      deactivate_session: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      delete_message_including_and_after: {
        Args: {
          p_chat_id: string
          p_sequence_number: number
          p_user_id: string
        }
        Returns: undefined
      }
      delete_messages_including_and_after: {
        Args: {
          p_chat_id: string
          p_sequence_number: number
          p_user_id: string
        }
        Returns: undefined
      }
      delete_storage_object: {
        Args: { bucket: string; object: string }
        Returns: Record<string, unknown>
      }
      delete_storage_object_from_bucket: {
        Args: { bucket_name: string; object_path: string }
        Returns: Record<string, unknown>
      }
      get_all_model_usage: {
        Args: { p_user_id: string }
        Returns: {
          can_use: boolean
          is_unlimited: boolean
          model_id: string
          model_name: string
          monthly_limit: number
          remaining: number
          usage_count: number
        }[]
      }
      get_model_usage_status: {
        Args: { p_model_id: string; p_user_id: string }
        Returns: {
          can_use: boolean
          is_unlimited: boolean
          model_id: string
          model_name: string
          monthly_limit: number
          remaining: number
          usage_count: number
        }[]
      }
      get_or_create_current_usage: {
        Args: { p_user_id: string }
        Returns: {
          chat_sessions_count: number | null
          created_at: string | null
          id: string
          input_tokens_used: number | null
          messages_count: number | null
          output_tokens_used: number | null
          period_end: string
          period_start: string
          processes_created: number | null
          subscription_id: string | null
          transcription_seconds_used: number | null
          updated_at: string | null
          user_id: string
        }
      }
      increment_access_count: { Args: { vault_ref: string }; Returns: number }
      increment_model_usage: {
        Args: { p_model_id: string; p_user_id: string }
        Returns: {
          error_message: string
          monthly_limit: number
          remaining: number
          success: boolean
          usage_count: number
        }[]
      }
      increment_token_usage: {
        Args: {
          p_input_tokens?: number
          p_output_tokens?: number
          p_user_id: string
        }
        Returns: {
          chat_sessions_count: number | null
          created_at: string | null
          id: string
          input_tokens_used: number | null
          messages_count: number | null
          output_tokens_used: number | null
          period_end: string
          period_start: string
          processes_created: number | null
          subscription_id: string | null
          transcription_seconds_used: number | null
          updated_at: string | null
          user_id: string
        }
      }
      invalidate_auth_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      match_file_items_local: {
        Args: {
          file_ids?: string[]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          file_id: string
          id: string
          similarity: number
          tokens: number
        }[]
      }
      match_file_items_openai: {
        Args: {
          file_ids?: string[]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          file_id: string
          id: string
          similarity: number
          tokens: number
        }[]
      }
      non_private_assistant_exists: {
        Args: { p_name: string }
        Returns: boolean
      }
      non_private_file_exists: { Args: { p_name: string }; Returns: boolean }
      non_private_workspace_exists: {
        Args: { p_name: string }
        Returns: boolean
      }
      update_session_activity: {
        Args: { p_session_token: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
