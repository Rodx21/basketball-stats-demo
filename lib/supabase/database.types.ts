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
    PostgrestVersion: "14.5"
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
      game_events: {
        Row: {
          assisted_by_player_id: string | null
          created_at: string | null
          event_type: string
          game_clock_seconds: number | null
          game_id: string
          half: number
          id: string
          period: number
          player_id: string | null
          pnr_coverage: string | null
          shot_zone: string | null
          team_id: string
        }
        Insert: {
          assisted_by_player_id?: string | null
          created_at?: string | null
          event_type: string
          game_clock_seconds?: number | null
          game_id: string
          half?: number
          id?: string
          period: number
          player_id?: string | null
          pnr_coverage?: string | null
          shot_zone?: string | null
          team_id: string
        }
        Update: {
          assisted_by_player_id?: string | null
          created_at?: string | null
          event_type?: string
          game_clock_seconds?: number | null
          game_id?: string
          half?: number
          id?: string
          period?: number
          player_id?: string | null
          pnr_coverage?: string | null
          shot_zone?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_events_assisted_by_player_id_fkey"
            columns: ["assisted_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_score: number | null
          away_team_id: string
          created_at: string | null
          game_date: string
          home_score: number | null
          home_team_id: string
          id: string
          period_length_minutes: number | null
          periods: number | null
          season_id: string | null
          status: string | null
          user_id: string
          venue: string | null
          verified_at: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          created_at?: string | null
          game_date: string
          home_score?: number | null
          home_team_id: string
          id?: string
          period_length_minutes?: number | null
          periods?: number | null
          season_id?: string | null
          status?: string | null
          user_id: string
          venue?: string | null
          verified_at?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          created_at?: string | null
          game_date?: string
          home_score?: number | null
          home_team_id?: string
          id?: string
          period_length_minutes?: number | null
          periods?: number | null
          season_id?: string | null
          status?: string | null
          user_id?: string
          venue?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_rules: {
        Row: {
          created_at: string | null
          game_id: string | null
          id: string
          label: string
          points: number
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          label: string
          points?: number
          sort_order?: number
          user_id?: string
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          label?: string
          points?: number
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      live_options: {
        Row: {
          created_at: string | null
          group_key: string
          group_label: string
          id: string
          label: string
          list: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_key?: string
          group_label?: string
          id?: string
          label: string
          list: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          created_at?: string | null
          group_key?: string
          group_label?: string
          id?: string
          label?: string
          list?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      live_scout_events: {
        Row: {
          category: string
          coverage: string | null
          created_at: string | null
          defense: string | null
          game_id: string
          id: string
          kind: string
          note: string | null
          option: string
          outcome: string | null
          period: number
          player: string | null
          points: number | null
          rules: Json | null
          tov_by: string | null
          tov_forced_by: string | null
          actor: string | null
          broken: boolean
          bad_shot: boolean
          on_court_ours: string[] | null
          on_court_theirs: string[] | null
          penalty: number | null
          score: number | null
          turnover: boolean
        }
        Insert: {
          category: string
          coverage?: string | null
          created_at?: string | null
          defense?: string | null
          game_id: string
          id?: string
          kind?: string
          note?: string | null
          option: string
          outcome?: string | null
          period?: number
          player?: string | null
          points?: number | null
          rules?: Json | null
          tov_by?: string | null
          tov_forced_by?: string | null
          actor?: string | null
          broken?: boolean
          bad_shot?: boolean
          on_court_ours?: string[] | null
          on_court_theirs?: string[] | null
          penalty?: number | null
          score?: number | null
          turnover?: boolean
        }
        Update: {
          category?: string
          coverage?: string | null
          created_at?: string | null
          defense?: string | null
          game_id?: string
          id?: string
          kind?: string
          note?: string | null
          option?: string
          outcome?: string | null
          period?: number
          player?: string | null
          points?: number | null
          rules?: Json | null
          tov_by?: string | null
          tov_forced_by?: string | null
          actor?: string | null
          broken?: boolean
          bad_shot?: boolean
          on_court_ours?: string[] | null
          on_court_theirs?: string[] | null
          penalty?: number | null
          score?: number | null
          turnover?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "live_scout_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_game_stats: {
        Row: {
          ast: number | null
          blk: number | null
          dreb: number | null
          fg3a: number | null
          fg3m: number | null
          fga: number | null
          fgm: number | null
          fouls_drawn: number | null
          fta: number | null
          ftm: number | null
          game_id: string
          id: string
          minutes_played: number | null
          oreb: number | null
          pf: number | null
          player_id: string
          pts: number | null
          shots_rejected: number | null
          stl: number | null
          tov: number | null
          updated_at: string | null
        }
        Insert: {
          ast?: number | null
          blk?: number | null
          dreb?: number | null
          fg3a?: number | null
          fg3m?: number | null
          fga?: number | null
          fgm?: number | null
          fouls_drawn?: number | null
          fta?: number | null
          ftm?: number | null
          game_id: string
          id?: string
          minutes_played?: number | null
          oreb?: number | null
          pf?: number | null
          player_id: string
          pts?: number | null
          shots_rejected?: number | null
          stl?: number | null
          tov?: number | null
          updated_at?: string | null
        }
        Update: {
          ast?: number | null
          blk?: number | null
          dreb?: number | null
          fg3a?: number | null
          fg3m?: number | null
          fga?: number | null
          fgm?: number | null
          fouls_drawn?: number | null
          fta?: number | null
          ftm?: number | null
          game_id?: string
          id?: string
          minutes_played?: number | null
          oreb?: number | null
          pf?: number | null
          player_id?: string
          pts?: number | null
          shots_rejected?: number | null
          stl?: number | null
          tov?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean | null
          birth_date: string | null
          created_at: string | null
          full_name: string
          height_cm: number | null
          id: string
          jersey_number: number | null
          photo_url: string | null
          position: string | null
          team_id: string
        }
        Insert: {
          active?: boolean | null
          birth_date?: string | null
          created_at?: string | null
          full_name: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          photo_url?: string | null
          position?: string | null
          team_id: string
        }
        Update: {
          active?: boolean | null
          birth_date?: string | null
          created_at?: string | null
          full_name?: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          photo_url?: string | null
          position?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scouting_category_notes: {
        Row: {
          body: string | null
          category: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          category: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouting_category_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scouting_clips: {
        Row: {
          category: string
          created_at: string | null
          id: string
          note: string | null
          section: string
          sort_order: number | null
          team_id: string
          video_url: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          note?: string | null
          section: string
          sort_order?: number | null
          team_id: string
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          note?: string | null
          section?: string
          sort_order?: number | null
          team_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouting_clips_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scouting_notes: {
        Row: {
          defensive_tendencies: string | null
          game_plan_fastbreak: string | null
          game_plan_pnr: string | null
          game_plan_targets: string | null
          offensive_tendencies: string | null
          personnel: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          defensive_tendencies?: string | null
          game_plan_fastbreak?: string | null
          game_plan_pnr?: string | null
          game_plan_targets?: string | null
          offensive_tendencies?: string | null
          personnel?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          defensive_tendencies?: string | null
          game_plan_fastbreak?: string | null
          game_plan_pnr?: string | null
          game_plan_targets?: string | null
          offensive_tendencies?: string | null
          personnel?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouting_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          is_own_team: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_own_team?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_own_team?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
