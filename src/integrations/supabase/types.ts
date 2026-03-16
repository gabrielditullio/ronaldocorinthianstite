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
      ad_metrics: {
        Row: {
          clicks: number | null
          created_at: string | null
          date: string
          funnel_id: string | null
          id: string
          impressions: number | null
          investment: number | null
          leads_from_ads: number | null
          page_views: number | null
          user_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          date: string
          funnel_id?: string | null
          id?: string
          impressions?: number | null
          investment?: number | null
          leads_from_ads?: number | null
          page_views?: number | null
          user_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          date?: string
          funnel_id?: string | null
          id?: string
          impressions?: number | null
          investment?: number | null
          leads_from_ads?: number | null
          page_views?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_metrics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          notes: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          notes?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          description?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      benchmark_configs: {
        Row: {
          coaching_text: string
          funnel_type: string
          id: string
          level: string
          max_value: number | null
          metric_key: string
          min_value: number | null
          updated_at: string
        }
        Insert: {
          coaching_text?: string
          funnel_type: string
          id?: string
          level: string
          max_value?: number | null
          metric_key: string
          min_value?: number | null
          updated_at?: string
        }
        Update: {
          coaching_text?: string
          funnel_type?: string
          id?: string
          level?: string
          max_value?: number | null
          metric_key?: string
          min_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cac_calculations: {
        Row: {
          avg_ticket: number | null
          cac: number | null
          created_at: string | null
          id: string
          marketing_investment: number | null
          month_year: string
          new_clients: number | null
          payback_months: number | null
          sales_investment: number | null
          tools_investment: number | null
          total_investment: number | null
          user_id: string
        }
        Insert: {
          avg_ticket?: number | null
          cac?: number | null
          created_at?: string | null
          id?: string
          marketing_investment?: number | null
          month_year: string
          new_clients?: number | null
          payback_months?: number | null
          sales_investment?: number | null
          tools_investment?: number | null
          total_investment?: number | null
          user_id: string
        }
        Update: {
          avg_ticket?: number | null
          cac?: number | null
          created_at?: string | null
          id?: string
          marketing_investment?: number | null
          month_year?: string
          new_clients?: number | null
          payback_months?: number | null
          sales_investment?: number | null
          tools_investment?: number | null
          total_investment?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cac_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_monthly_data: {
        Row: {
          actual: number
          channel_id: string
          created_at: string
          funnel_id: string | null
          id: string
          month: number
          target: number
          user_id: string
          year: number
        }
        Insert: {
          actual?: number
          channel_id: string
          created_at?: string
          funnel_id?: string | null
          id?: string
          month: number
          target?: number
          user_id: string
          year: number
        }
        Update: {
          actual?: number
          channel_id?: string
          created_at?: string
          funnel_id?: string | null
          id?: string
          month?: number
          target?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_monthly_data_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_monthly_data_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_monthly_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_seller_kpis: {
        Row: {
          created_at: string
          date: string
          funnel_id: string | null
          id: string
          leads_generated: number
          leads_qualified: number
          meetings_completed: number
          meetings_scheduled: number
          net_revenue: number
          revenue: number
          sales: number
          sdr_team_member_id: string | null
          team_member_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          funnel_id?: string | null
          id?: string
          leads_generated?: number
          leads_qualified?: number
          meetings_completed?: number
          meetings_scheduled?: number
          net_revenue?: number
          revenue?: number
          sales?: number
          sdr_team_member_id?: string | null
          team_member_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          funnel_id?: string | null
          id?: string
          leads_generated?: number
          leads_qualified?: number
          meetings_completed?: number
          meetings_scheduled?: number
          net_revenue?: number
          revenue?: number
          sales?: number
          sdr_team_member_id?: string | null
          team_member_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_seller_kpis_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_seller_kpis_sdr_team_member_id_fkey"
            columns: ["sdr_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_seller_kpis_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_seller_kpis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          created_at: string | null
          id: string
          month_year: string
          q1_leads_per_week: number | null
          q2_lead_to_meeting: number | null
          q3_meeting_to_proposal: number | null
          q4_proposal_to_close: number | null
          q5_team_knows_goals: number | null
          q6_weekly_data_review: number | null
          q7_sdr_closer_sla: number | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_year: string
          q1_leads_per_week?: number | null
          q2_lead_to_meeting?: number | null
          q3_meeting_to_proposal?: number | null
          q4_proposal_to_close?: number | null
          q5_team_knows_goals?: number | null
          q6_weekly_data_review?: number | null
          q7_sdr_closer_sla?: number | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month_year?: string
          q1_leads_per_week?: number | null
          q2_lead_to_meeting?: number | null
          q3_meeting_to_proposal?: number | null
          q4_proposal_to_close?: number | null
          q5_team_knows_goals?: number | null
          q6_weekly_data_review?: number | null
          q7_sdr_closer_sla?: number | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string | null
          description: string | null
          funnel_type: string
          id: string
          is_active: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          funnel_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          funnel_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_simulations: {
        Row: {
          avg_ticket: number | null
          conversion_rate: number | null
          created_at: string | null
          funnel_id: string | null
          id: string
          num_sellers: number | null
          qualification_rate: number | null
          scheduling_rate: number | null
          show_rate: number | null
          target_revenue: number | null
          user_id: string
          working_days: number | null
        }
        Insert: {
          avg_ticket?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          num_sellers?: number | null
          qualification_rate?: number | null
          scheduling_rate?: number | null
          show_rate?: number | null
          target_revenue?: number | null
          user_id: string
          working_days?: number | null
        }
        Update: {
          avg_ticket?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          num_sellers?: number | null
          qualification_rate?: number | null
          scheduling_rate?: number | null
          show_rate?: number | null
          target_revenue?: number | null
          user_id?: string
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_simulations_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_simulations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_transitions: {
        Row: {
          from_stage: string | null
          id: string
          lead_id: string
          to_stage: string
          transitioned_at: string
          user_id: string
        }
        Insert: {
          from_stage?: string | null
          id?: string
          lead_id: string
          to_stage: string
          transitioned_at?: string
          user_id: string
        }
        Update: {
          from_stage?: string | null
          id?: string
          lead_id?: string
          to_stage?: string
          transitioned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_transitions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_transitions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          funnel_id: string | null
          id: string
          lead_source: string | null
          name: string
          notes: string | null
          previous_stage: string | null
          proposal_value: number | null
          stage: string
          stage_changed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          lead_source?: string | null
          name: string
          notes?: string | null
          previous_stage?: string | null
          proposal_value?: number | null
          stage?: string
          stage_changed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          lead_source?: string | null
          name?: string
          notes?: string | null
          previous_stage?: string | null
          proposal_value?: number | null
          stage?: string
          stage_changed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_snapshots: {
        Row: {
          avg_ticket: number | null
          cac: number | null
          close_rate: number | null
          created_at: string | null
          deals_closed: number | null
          funnel_id: string | null
          id: string
          leads_generated: number | null
          ltv_cac_ratio: number | null
          meetings_booked: number | null
          month_year: string
          proposals_sent: number | null
          qualification_rate: number | null
          total_billed: number | null
          total_received: number | null
          total_revenue: number | null
          user_id: string
        }
        Insert: {
          avg_ticket?: number | null
          cac?: number | null
          close_rate?: number | null
          created_at?: string | null
          deals_closed?: number | null
          funnel_id?: string | null
          id?: string
          leads_generated?: number | null
          ltv_cac_ratio?: number | null
          meetings_booked?: number | null
          month_year: string
          proposals_sent?: number | null
          qualification_rate?: number | null
          total_billed?: number | null
          total_received?: number | null
          total_revenue?: number | null
          user_id: string
        }
        Update: {
          avg_ticket?: number | null
          cac?: number | null
          close_rate?: number | null
          created_at?: string | null
          deals_closed?: number | null
          funnel_id?: string | null
          id?: string
          leads_generated?: number | null
          ltv_cac_ratio?: number | null
          meetings_booked?: number | null
          month_year?: string
          proposals_sent?: number | null
          qualification_rate?: number | null
          total_billed?: number | null
          total_received?: number | null
          total_revenue?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_snapshots_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          target: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          target?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          target?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      pipeline_meetings: {
        Row: {
          actions: string | null
          created_at: string | null
          facilitator: string | null
          funnel_id: string | null
          id: string
          meeting_date: string
          next_meeting_date: string | null
          next_meeting_time: string | null
          notes: string | null
          pipeline_cleanup: string | null
          problems: string | null
          user_id: string
          week_label: string | null
          wins: string | null
        }
        Insert: {
          actions?: string | null
          created_at?: string | null
          facilitator?: string | null
          funnel_id?: string | null
          id?: string
          meeting_date?: string
          next_meeting_date?: string | null
          next_meeting_time?: string | null
          notes?: string | null
          pipeline_cleanup?: string | null
          problems?: string | null
          user_id: string
          week_label?: string | null
          wins?: string | null
        }
        Update: {
          actions?: string | null
          created_at?: string | null
          facilitator?: string | null
          funnel_id?: string | null
          id?: string
          meeting_date?: string
          next_meeting_date?: string | null
          next_meeting_time?: string | null
          notes?: string | null
          pipeline_cleanup?: string | null
          problems?: string | null
          user_id?: string
          week_label?: string | null
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_meetings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          has_order_bump: boolean | null
          hotmart_transaction_id: string | null
          id: string
          is_admin: boolean | null
          phone: string | null
          role: string
          subscription_activated_at: string | null
          subscription_status: string
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          has_order_bump?: boolean | null
          hotmart_transaction_id?: string | null
          id: string
          is_admin?: boolean | null
          phone?: string | null
          role?: string
          subscription_activated_at?: string | null
          subscription_status?: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          has_order_bump?: boolean | null
          hotmart_transaction_id?: string | null
          id?: string
          is_admin?: boolean | null
          phone?: string | null
          role?: string
          subscription_activated_at?: string | null
          subscription_status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_channels: {
        Row: {
          created_at: string
          funnel_id: string | null
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funnel_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          funnel_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_channels_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_metrics: {
        Row: {
          action_items: string | null
          attendance_rate: number | null
          avg_ticket: number | null
          confirmation_rate: number | null
          created_at: string
          form_completion_rate: number | null
          funnel_id: string | null
          id: string
          key_decisions: string | null
          month: number | null
          noshow_confirmed: number | null
          noshow_unconfirmed: number | null
          notes: string | null
          recorded_calls_rate: number | null
          reschedule_rate: number | null
          scheduling_rate: number | null
          session_date: string
          user_id: string
          year: number | null
        }
        Insert: {
          action_items?: string | null
          attendance_rate?: number | null
          avg_ticket?: number | null
          confirmation_rate?: number | null
          created_at?: string
          form_completion_rate?: number | null
          funnel_id?: string | null
          id?: string
          key_decisions?: string | null
          month?: number | null
          noshow_confirmed?: number | null
          noshow_unconfirmed?: number | null
          notes?: string | null
          recorded_calls_rate?: number | null
          reschedule_rate?: number | null
          scheduling_rate?: number | null
          session_date?: string
          user_id: string
          year?: number | null
        }
        Update: {
          action_items?: string | null
          attendance_rate?: number | null
          avg_ticket?: number | null
          confirmation_rate?: number | null
          created_at?: string
          form_completion_rate?: number | null
          funnel_id?: string | null
          id?: string
          key_decisions?: string | null
          month?: number | null
          noshow_confirmed?: number | null
          noshow_unconfirmed?: number | null
          notes?: string | null
          recorded_calls_rate?: number | null
          reschedule_rate?: number | null
          scheduling_rate?: number | null
          session_date?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_metrics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          monthly_lead_goal: number | null
          monthly_revenue_goal: number | null
          name: string
          phone: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          monthly_lead_goal?: number | null
          monthly_revenue_goal?: number | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          monthly_lead_goal?: number | null
          monthly_revenue_goal?: number | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          headers: Json | null
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string | null
          headers?: Json | null
          id?: string
          payload: Json
        }
        Update: {
          created_at?: string | null
          headers?: Json | null
          id?: string
          payload?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_admin_role: { Args: { _user_id: string }; Returns: boolean }
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
