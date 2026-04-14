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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agency_profile: {
        Row: {
          agency_name: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          agency_name?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          agency_name?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_memory: {
        Row: {
          ai_analysis: string | null
          ai_recommendations: string | null
          best_campaign: string | null
          client_id: string
          conversion_rate: number | null
          created_at: string | null
          id: number
          performance_score: number | null
          raw_data: Json | null
          report_date: string | null
          total_leads: number | null
          total_spend: number | null
          week_end: string
          week_start: string
          worst_campaign: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_recommendations?: string | null
          best_campaign?: string | null
          client_id: string
          conversion_rate?: number | null
          created_at?: string | null
          id?: number
          performance_score?: number | null
          raw_data?: Json | null
          report_date?: string | null
          total_leads?: number | null
          total_spend?: number | null
          week_end: string
          week_start: string
          worst_campaign?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_recommendations?: string | null
          best_campaign?: string | null
          client_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          id?: number
          performance_score?: number | null
          raw_data?: Json | null
          report_date?: string | null
          total_leads?: number | null
          total_spend?: number | null
          week_end?: string
          week_start?: string
          worst_campaign?: string | null
        }
        Relationships: []
      }
      assignment_log: {
        Row: {
          created_at: string | null
          from_rep: string | null
          id: string
          lead_id: string | null
          org_id: string | null
          reason: string
          to_rep: string
        }
        Insert: {
          created_at?: string | null
          from_rep?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string | null
          reason: string
          to_rep: string
        }
        Update: {
          created_at?: string | null
          from_rep?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string | null
          reason?: string
          to_rep?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_name: string | null
          client_id: string | null
          cpl: string | null
          created_at: string
          date: string | null
          id: number
          leads_count: string | null
          spend: string | null
          status: string | null
        }
        Insert: {
          campaign_name?: string | null
          client_id?: string | null
          cpl?: string | null
          created_at?: string
          date?: string | null
          id?: number
          leads_count?: string | null
          spend?: string | null
          status?: string | null
        }
        Update: {
          campaign_name?: string | null
          client_id?: string | null
          cpl?: string | null
          created_at?: string
          date?: string | null
          id?: number
          leads_count?: string | null
          spend?: string | null
          status?: string | null
        }
        Relationships: []
      }
      campaigns_data: {
        Row: {
          campaign_id_meta: string | null
          campaign_name: string
          clicks: number | null
          client_id: string
          conversion_rate: number | null
          cpl: number | null
          created_at: string | null
          date: string
          id: string
          impressions: number | null
          leads: number | null
          leads_count: number | null
          org_id: string | null
          roi: number | null
          spend: number | null
          status: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id_meta?: string | null
          campaign_name: string
          clicks?: number | null
          client_id: string
          conversion_rate?: number | null
          cpl?: number | null
          created_at?: string | null
          date: string
          id?: string
          impressions?: number | null
          leads?: number | null
          leads_count?: number | null
          org_id?: string | null
          roi?: number | null
          spend?: number | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id_meta?: string | null
          campaign_name?: string
          clicks?: number | null
          client_id?: string
          conversion_rate?: number | null
          cpl?: number | null
          created_at?: string | null
          date?: string
          id?: string
          impressions?: number | null
          leads?: number | null
          leads_count?: number | null
          org_id?: string | null
          roi?: number | null
          spend?: number | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          api_token: string | null
          created_at: string | null
          email: string
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          id: string
          last_synced_at: string | null
          name: string
          plan: string | null
          selected_sheet_id: string | null
          selected_sheet_name: string | null
          sync_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_token?: string | null
          created_at?: string | null
          email: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          plan?: string | null
          selected_sheet_id?: string | null
          selected_sheet_name?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_token?: string | null
          created_at?: string | null
          email?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          plan?: string | null
          selected_sheet_id?: string | null
          selected_sheet_name?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          org_id: string | null
          role: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          org_id?: string | null
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          org_id?: string | null
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          lead_id: string | null
          org_id: string | null
          user_email: string
          user_name: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string | null
          user_email: string
          user_name?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string | null
          user_email?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string | null
          first_contact_at: string | null
          id: string
          job_title: string | null
          name: string | null
          notes: string | null
          org_id: string | null
          phone: string | null
          project: string | null
          response_time_minutes: number | null
          score: number | null
          sheet_row_index: number | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string | null
          first_contact_at?: string | null
          id?: string
          job_title?: string | null
          name?: string | null
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          project?: string | null
          response_time_minutes?: number | null
          score?: number | null
          sheet_row_index?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string | null
          first_contact_at?: string | null
          id?: string
          job_title?: string | null
          name?: string | null
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          project?: string | null
          response_time_minutes?: number | null
          score?: number | null
          sheet_row_index?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          org_id: string
          title: string | null
          type: string
          user_email: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          org_id: string
          title?: string | null
          type?: string
          user_email?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          org_id?: string
          title?: string | null
          type?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          member_type: string | null
          org_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          member_type?: string | null
          org_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          member_type?: string | null
          org_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          agency_id: string | null
          campaigns_sheet_id: string | null
          client_email: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          leads_sheet_id: string | null
          name: string
          owner_id: string | null
        }
        Insert: {
          agency_id?: string | null
          campaigns_sheet_id?: string | null
          client_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          leads_sheet_id?: string | null
          name: string
          owner_id?: string | null
        }
        Update: {
          agency_id?: string | null
          campaigns_sheet_id?: string | null
          client_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          leads_sheet_id?: string | null
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      quality_scores: {
        Row: {
          calculated_at: string | null
          campaign_score: number | null
          client_id: string
          closing_rate_score: number | null
          created_at: string | null
          feedback_score: number | null
          grade: string | null
          id: string
          period: string
          sales_speed_score: number | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          campaign_score?: number | null
          client_id: string
          closing_rate_score?: number | null
          created_at?: string | null
          feedback_score?: number | null
          grade?: string | null
          id?: string
          period: string
          sales_speed_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          campaign_score?: number | null
          client_id?: string
          closing_rate_score?: number | null
          created_at?: string | null
          feedback_score?: number | null
          grade?: string | null
          id?: string
          period?: string
          sales_speed_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_coaching: {
        Row: {
          ai_analysis: string | null
          ai_recommendations: string | null
          client_id: string
          created_at: string | null
          id: number
          lead_id: number | null
          lead_name: string | null
          lead_score: number | null
          lead_source: string | null
          loss_reason: string | null
          raw_response: string | null
          salesperson: string | null
          salesperson_name: string | null
          success_probability: number | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_recommendations?: string | null
          client_id: string
          created_at?: string | null
          id?: number
          lead_id?: number | null
          lead_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          loss_reason?: string | null
          raw_response?: string | null
          salesperson?: string | null
          salesperson_name?: string | null
          success_probability?: number | null
        }
        Update: {
          ai_analysis?: string | null
          ai_recommendations?: string | null
          client_id?: string
          created_at?: string | null
          id?: number
          lead_id?: number | null
          lead_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          loss_reason?: string | null
          raw_response?: string | null
          salesperson?: string | null
          salesperson_name?: string | null
          success_probability?: number | null
        }
        Relationships: []
      }
      sales_performance: {
        Row: {
          avg_deal_value: number | null
          avg_response_time: number | null
          calculated_at: string | null
          calls_made: number | null
          client_id: string
          closed_deals: number | null
          conversion_rate: number | null
          created_at: string | null
          date: string
          id: string
          leads_received: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avg_deal_value?: number | null
          avg_response_time?: number | null
          calculated_at?: string | null
          calls_made?: number | null
          client_id: string
          closed_deals?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          id?: string
          leads_received?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avg_deal_value?: number | null
          avg_response_time?: number | null
          calculated_at?: string | null
          calls_made?: number | null
          client_id?: string
          closed_deals?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          leads_received?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          client_id: string
          created_at: string | null
          ends_at: string | null
          id: string
          plan: string
          starts_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          plan: string
          starts_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          plan?: string
          starts_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          client_id: string
          created_at: string | null
          error_message: string | null
          id: string
          rows_synced: number | null
          sheet_id: string | null
          status: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          rows_synced?: number | null
          sheet_id?: string | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          rows_synced?: number | null
          sheet_id?: string | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          crm_can_add: boolean | null
          crm_can_assign: boolean | null
          crm_can_delete: boolean | null
          crm_see_all: boolean | null
          crm_see_all_comments: boolean | null
          id: string
          is_custom: boolean | null
          org_id: string
          page_access: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crm_can_add?: boolean | null
          crm_can_assign?: boolean | null
          crm_can_delete?: boolean | null
          crm_see_all?: boolean | null
          crm_see_all_comments?: boolean | null
          id?: string
          is_custom?: boolean | null
          org_id: string
          page_access?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          crm_can_add?: boolean | null
          crm_can_assign?: boolean | null
          crm_can_delete?: boolean | null
          crm_see_all?: boolean | null
          crm_see_all_comments?: boolean | null
          id?: string
          is_custom?: boolean | null
          org_id?: string
          page_access?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          org_id: string
          client_id: string | null
          title: string
          description: string | null
          priority: string | null
          status: string | null
          category: string | null
          assigned_to: string | null
          assigned_by: string | null
          auto_assigned: boolean | null
          due_date: string | null
          completed_at: string | null
          estimated_hours: number | null
          actual_hours: number | null
          source: string | null
          source_ref: string | null
          tags: string[] | null
          ai_score: number | null
          ai_feedback: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          client_id?: string | null
          title: string
          description?: string | null
          priority?: string | null
          status?: string | null
          category?: string | null
          assigned_to?: string | null
          assigned_by?: string | null
          auto_assigned?: boolean | null
          due_date?: string | null
          completed_at?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          source?: string | null
          source_ref?: string | null
          tags?: string[] | null
          ai_score?: number | null
          ai_feedback?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          client_id?: string | null
          title?: string
          description?: string | null
          priority?: string | null
          status?: string | null
          category?: string | null
          assigned_to?: string | null
          assigned_by?: string | null
          auto_assigned?: boolean | null
          due_date?: string | null
          completed_at?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          source?: string | null
          source_ref?: string | null
          tags?: string[] | null
          ai_score?: number | null
          ai_feedback?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          id: string
          org_id: string
          task_id: string | null
          user_email: string
          user_name: string | null
          log_type: string | null
          content: string
          hours_spent: number | null
          mood: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          task_id?: string | null
          user_email: string
          user_name?: string | null
          log_type?: string | null
          content: string
          hours_spent?: number | null
          mood?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          task_id?: string | null
          user_email?: string
          user_name?: string | null
          log_type?: string | null
          content?: string
          hours_spent?: number | null
          mood?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignment_rules: {
        Row: {
          id: string
          org_id: string
          user_email: string
          categories: string[] | null
          max_concurrent_tasks: number | null
          skill_level: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          user_email: string
          categories?: string[] | null
          max_concurrent_tasks?: number | null
          skill_level?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          user_email?: string
          categories?: string[] | null
          max_concurrent_tasks?: number | null
          skill_level?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignment_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summaries: {
        Row: {
          id: string
          org_id: string
          user_email: string
          summary_date: string
          tasks_completed: number | null
          tasks_in_progress: number | null
          total_hours: number | null
          productivity_score: number | null
          ai_summary: string | null
          ai_recommendations: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          user_email: string
          summary_date: string
          tasks_completed?: number | null
          tasks_in_progress?: number | null
          total_hours?: number | null
          productivity_score?: number | null
          ai_summary?: string | null
          ai_recommendations?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          user_email?: string
          summary_date?: string
          tasks_completed?: number | null
          tasks_in_progress?: number | null
          total_hours?: number | null
          productivity_score?: number | null
          ai_summary?: string | null
          ai_recommendations?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          id: string
          org_id: string
          client_id: string | null
          name: string
          website: string | null
          logo_url: string | null
          industry: string | null
          description: string | null
          social_links: Json | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          client_id?: string | null
          name: string
          website?: string | null
          logo_url?: string | null
          industry?: string | null
          description?: string | null
          social_links?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          client_id?: string | null
          name?: string
          website?: string | null
          logo_url?: string | null
          industry?: string | null
          description?: string | null
          social_links?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_intel: {
        Row: {
          id: string
          org_id: string
          competitor_id: string
          intel_type: string
          title: string
          value: number | null
          previous_value: number | null
          unit: string | null
          details: Json | null
          source: string | null
          source_url: string | null
          captured_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          competitor_id: string
          intel_type: string
          title: string
          value?: number | null
          previous_value?: number | null
          unit?: string | null
          details?: Json | null
          source?: string | null
          source_url?: string | null
          captured_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          competitor_id?: string
          intel_type?: string
          title?: string
          value?: number | null
          previous_value?: number | null
          unit?: string | null
          details?: Json | null
          source?: string | null
          source_url?: string | null
          captured_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_intel_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_intel_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_reports: {
        Row: {
          id: string
          org_id: string
          client_id: string | null
          report_type: string | null
          title: string
          content: string
          ai_threat_level: string | null
          ai_opportunities: Json | null
          ai_recommendations: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          client_id?: string | null
          report_type?: string | null
          title: string
          content: string
          ai_threat_level?: string | null
          ai_opportunities?: Json | null
          ai_recommendations?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          client_id?: string | null
          report_type?: string | null
          title?: string
          content?: string
          ai_threat_level?: string | null
          ai_opportunities?: Json | null
          ai_recommendations?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      market_benchmarks: {
        Row: {
          id: string
          org_id: string
          metric_name: string
          metric_value: number
          industry: string | null
          region: string | null
          period: string | null
          source: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          metric_name: string
          metric_value: number
          industry?: string | null
          region?: string | null
          period?: string | null
          source?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          metric_name?: string
          metric_value?: number
          industry?: string | null
          region?: string | null
          period?: string | null
          source?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_benchmarks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          client_id: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          password_hash: string
          role: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          password_hash: string
          role: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          password_hash?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clients_safe: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          last_synced_at: string | null
          name: string | null
          plan: string | null
          selected_sheet_id: string | null
          selected_sheet_name: string | null
          sync_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_synced_at?: string | null
          name?: string | null
          plan?: string | null
          selected_sheet_id?: string | null
          selected_sheet_name?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_synced_at?: string | null
          name?: string | null
          plan?: string | null
          selected_sheet_id?: string | null
          selected_sheet_name?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_org_members_with_email: {
        Args: never
        Returns: {
          display_name: string
          email: string
          role: string
          user_id: string
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      get_user_permissions: {
        Args: never
        Returns: {
          crm_can_add: boolean
          crm_can_assign: boolean
          crm_can_delete: boolean
          crm_see_all: boolean
          crm_see_all_comments: boolean
          is_custom: boolean
          page_access: string[]
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      reassign_stale_leads: { Args: never; Returns: undefined }
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
