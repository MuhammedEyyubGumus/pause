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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_events: {
        Row: {
          app_version: string | null
          created_at: string
          id: number
          name: string
          props: Json
          session_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: never
          name: string
          props?: Json
          session_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: never
          name?: string
          props?: Json
          session_id?: string
        }
        Relationships: []
      }
      behaviors: {
        Row: {
          archived_at: string | null
          cost_amount: number | null
          cost_currency: string
          created_at: string
          goal: Database["public"]["Enums"]["behavior_goal"]
          goal_text: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          pause_minutes: number
          sort_order: number
          template_key: string | null
          updated_at: string
          user_id: string
          usual_times: string[]
          why: string | null
        }
        Insert: {
          archived_at?: string | null
          cost_amount?: number | null
          cost_currency?: string
          created_at?: string
          goal?: Database["public"]["Enums"]["behavior_goal"]
          goal_text?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          pause_minutes?: number
          sort_order?: number
          template_key?: string | null
          updated_at?: string
          user_id?: string
          usual_times?: string[]
          why?: string | null
        }
        Update: {
          archived_at?: string | null
          cost_amount?: number | null
          cost_currency?: string
          created_at?: string
          goal?: Database["public"]["Enums"]["behavior_goal"]
          goal_text?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          pause_minutes?: number
          sort_order?: number
          template_key?: string | null
          updated_at?: string
          user_id?: string
          usual_times?: string[]
          why?: string | null
        }
        Relationships: []
      }
      event_answers: {
        Row: {
          created_at: string
          event_id: string
          question_key: string
          user_id: string
          value_num: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          question_key: string
          user_id?: string
          value_num?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          question_key?: string
          user_id?: string
          value_num?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_answers_event_id_user_id_fkey"
            columns: ["event_id", "user_id"]
            isOneToOne: false
            referencedRelation: "urge_events"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      event_emotions: {
        Row: {
          created_at: string
          event_id: string
          option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          option_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_emotions_event_id_user_id_fkey"
            columns: ["event_id", "user_id"]
            isOneToOne: false
            referencedRelation: "urge_events"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "event_emotions_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
      event_interventions: {
        Row: {
          completed: boolean
          created_at: string
          details: Json
          ended_at: string | null
          event_id: string
          id: string
          option_id: string
          position: number
          started_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          details?: Json
          ended_at?: string | null
          event_id: string
          id?: string
          option_id: string
          position?: number
          started_at?: string
          user_id?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          details?: Json
          ended_at?: string | null
          event_id?: string
          id?: string
          option_id?: string
          position?: number
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_interventions_event_id_user_id_fkey"
            columns: ["event_id", "user_id"]
            isOneToOne: false
            referencedRelation: "urge_events"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "event_interventions_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
      event_triggers: {
        Row: {
          created_at: string
          event_id: string
          option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          option_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_triggers_event_id_user_id_fkey"
            columns: ["event_id", "user_id"]
            isOneToOne: false
            referencedRelation: "urge_events"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "event_triggers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          behavior_id: string | null
          created_at: string
          ended_at: string | null
          ends_on: string
          id: string
          intervention_option_id: string
          min_urge: number
          starts_on: string
          status: Database["public"]["Enums"]["experiment_status"]
          trigger_option_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          behavior_id?: string | null
          created_at?: string
          ended_at?: string | null
          ends_on: string
          id?: string
          intervention_option_id: string
          min_urge?: number
          starts_on: string
          status?: Database["public"]["Enums"]["experiment_status"]
          trigger_option_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          behavior_id?: string | null
          created_at?: string
          ended_at?: string | null
          ends_on?: string
          id?: string
          intervention_option_id?: string
          min_urge?: number
          starts_on?: string
          status?: Database["public"]["Enums"]["experiment_status"]
          trigger_option_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_behavior_id_user_id_fkey"
            columns: ["behavior_id", "user_id"]
            isOneToOne: false
            referencedRelation: "behaviors"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "experiments_intervention_option_id_fkey"
            columns: ["intervention_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiments_trigger_option_id_fkey"
            columns: ["trigger_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_status: string
          answers: Json
          app_version: string | null
          created_at: string
          id: string
          screenshot_path: string | null
          user_agent: string | null
          user_id: string
          would_reuse: number | null
        }
        Insert: {
          admin_status?: string
          answers?: Json
          app_version?: string | null
          created_at?: string
          id?: string
          screenshot_path?: string | null
          user_agent?: string | null
          user_id?: string
          would_reuse?: number | null
        }
        Update: {
          admin_status?: string
          answers?: Json
          app_version?: string | null
          created_at?: string
          id?: string
          screenshot_path?: string | null
          user_agent?: string | null
          user_id?: string
          would_reuse?: number | null
        }
        Relationships: []
      }
      options: {
        Row: {
          behavior_id: string | null
          behavior_template_key: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          key: string | null
          kind: Database["public"]["Enums"]["option_kind"]
          label: string | null
          outcome_class: Database["public"]["Enums"]["outcome_class"] | null
          sort_order: number
          user_id: string | null
        }
        Insert: {
          behavior_id?: string | null
          behavior_template_key?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          key?: string | null
          kind: Database["public"]["Enums"]["option_kind"]
          label?: string | null
          outcome_class?: Database["public"]["Enums"]["outcome_class"] | null
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          behavior_id?: string | null
          behavior_template_key?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          key?: string | null
          kind?: Database["public"]["Enums"]["option_kind"]
          label?: string | null
          outcome_class?: Database["public"]["Enums"]["outcome_class"] | null
          sort_order?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "options_behavior_id_user_id_fkey"
            columns: ["behavior_id", "user_id"]
            isOneToOne: false
            referencedRelation: "behaviors"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          celebrated_milestones: string[]
          consents: Json
          created_at: string
          default_pause_minutes: number
          display_name: string | null
          id: string
          locale: string
          onboarding_completed_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          celebrated_milestones?: string[]
          consents?: Json
          created_at?: string
          default_pause_minutes?: number
          display_name?: string | null
          id: string
          locale?: string
          onboarding_completed_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          celebrated_milestones?: string[]
          consents?: Json
          created_at?: string
          default_pause_minutes?: number
          display_name?: string | null
          id?: string
          locale?: string
          onboarding_completed_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          last_success_at: string | null
          locale: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          last_success_at?: string | null
          locale?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          last_success_at?: string | null
          locale?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          created_at: string
          cut_point: Database["public"]["Enums"]["chain_step"] | null
          duration_minutes: number | null
          event_id: string
          first_action: string | null
          id: string
          next_option_id: string | null
          thought: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cut_point?: Database["public"]["Enums"]["chain_step"] | null
          duration_minutes?: number | null
          event_id: string
          first_action?: string | null
          id?: string
          next_option_id?: string | null
          thought?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          cut_point?: Database["public"]["Enums"]["chain_step"] | null
          duration_minutes?: number | null
          event_id?: string
          first_action?: string | null
          id?: string
          next_option_id?: string | null
          thought?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_event_id_user_id_fkey"
            columns: ["event_id", "user_id"]
            isOneToOne: false
            referencedRelation: "urge_events"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "reflections_next_option_id_fkey"
            columns: ["next_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
      urge_events: {
        Row: {
          behavior_id: string
          created_at: string
          deleted_at: string | null
          emergency_mode: boolean
          entry_ms: number | null
          id: string
          local_date: string
          local_hour: number
          local_weekday: number
          notes: string | null
          occurred_at: string
          outcome_class: Database["public"]["Enums"]["outcome_class"] | null
          outcome_option_id: string | null
          pause_completed_at: string | null
          pause_ends_at: string | null
          pause_minutes: number | null
          pause_notified_at: string | null
          pause_started_at: string | null
          pause_status: Database["public"]["Enums"]["pause_status"]
          remeasured_at: string | null
          source: Database["public"]["Enums"]["event_source"]
          updated_at: string
          urge_after: number | null
          urge_before: number | null
          urge_change: number | null
          user_id: string
        }
        Insert: {
          behavior_id: string
          created_at?: string
          deleted_at?: string | null
          emergency_mode?: boolean
          entry_ms?: number | null
          id?: string
          local_date: string
          local_hour: number
          local_weekday: number
          notes?: string | null
          occurred_at?: string
          outcome_class?: Database["public"]["Enums"]["outcome_class"] | null
          outcome_option_id?: string | null
          pause_completed_at?: string | null
          pause_ends_at?: string | null
          pause_minutes?: number | null
          pause_notified_at?: string | null
          pause_started_at?: string | null
          pause_status?: Database["public"]["Enums"]["pause_status"]
          remeasured_at?: string | null
          source?: Database["public"]["Enums"]["event_source"]
          updated_at?: string
          urge_after?: number | null
          urge_before?: number | null
          urge_change?: number | null
          user_id?: string
        }
        Update: {
          behavior_id?: string
          created_at?: string
          deleted_at?: string | null
          emergency_mode?: boolean
          entry_ms?: number | null
          id?: string
          local_date?: string
          local_hour?: number
          local_weekday?: number
          notes?: string | null
          occurred_at?: string
          outcome_class?: Database["public"]["Enums"]["outcome_class"] | null
          outcome_option_id?: string | null
          pause_completed_at?: string | null
          pause_ends_at?: string | null
          pause_minutes?: number | null
          pause_notified_at?: string | null
          pause_started_at?: string | null
          pause_status?: Database["public"]["Enums"]["pause_status"]
          remeasured_at?: string | null
          source?: Database["public"]["Enums"]["event_source"]
          updated_at?: string
          urge_after?: number | null
          urge_before?: number | null
          urge_change?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "urge_events_behavior_id_user_id_fkey"
            columns: ["behavior_id", "user_id"]
            isOneToOne: false
            referencedRelation: "behaviors"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "urge_events_outcome_option_id_fkey"
            columns: ["outcome_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_feedback: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      admin_overview: { Args: never; Returns: Json }
      admin_product_metrics: { Args: { p_days?: number }; Returns: Json }
      admin_set_feedback_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      claim_due_pause_notifications: {
        Args: never
        Returns: {
          event_id: string
          user_id: string
        }[]
      }
      experiment_results: { Args: { p_experiment: string }; Returns: Json }
      get_insights: {
        Args: { p_behavior?: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      get_milestones: { Args: never; Returns: Json }
      get_savings: {
        Args: { p_behavior?: string; p_from?: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      option_usable: {
        Args: {
          p_kind: Database["public"]["Enums"]["option_kind"]
          p_option_id: string
        }
        Returns: boolean
      }
      prune_app_events: { Args: never; Returns: number }
      start_experiment: {
        Args: {
          p_behavior?: string
          p_intervention: string
          p_min_urge?: number
          p_today?: string
          p_trigger?: string
        }
        Returns: string
      }
    }
    Enums: {
      behavior_goal: "reduce" | "mindful" | "quit" | "custom"
      chain_step:
        | "trigger"
        | "thought"
        | "emotion"
        | "urge"
        | "first_action"
        | "control_shift"
        | "outcome"
      event_source: "live" | "sos" | "retro"
      experiment_status: "active" | "completed" | "abandoned"
      option_kind: "emotion" | "trigger" | "intervention" | "outcome"
      outcome_class:
        | "not_done"
        | "alternative"
        | "stopped_early"
        | "occurred"
        | "undecided"
      pause_status: "none" | "active" | "completed" | "abandoned"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      behavior_goal: ["reduce", "mindful", "quit", "custom"],
      chain_step: [
        "trigger",
        "thought",
        "emotion",
        "urge",
        "first_action",
        "control_shift",
        "outcome",
      ],
      event_source: ["live", "sos", "retro"],
      experiment_status: ["active", "completed", "abandoned"],
      option_kind: ["emotion", "trigger", "intervention", "outcome"],
      outcome_class: [
        "not_done",
        "alternative",
        "stopped_early",
        "occurred",
        "undecided",
      ],
      pause_status: ["none", "active", "completed", "abandoned"],
    },
  },
} as const
