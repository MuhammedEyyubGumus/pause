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
      feedback: {
        Row: {
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
      claim_due_pause_notifications: {
        Args: never
        Returns: {
          event_id: string
          user_id: string
        }[]
      }
      get_insights: {
        Args: { p_behavior?: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      option_usable: {
        Args: {
          p_kind: Database["public"]["Enums"]["option_kind"]
          p_option_id: string
        }
        Returns: boolean
      }
      prune_app_events: { Args: never; Returns: number }
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
