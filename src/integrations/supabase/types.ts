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
  public: {
    Tables: {
      pricing_settings: {
        Row: {
          frequency_multipliers: Json
          id: string
          min_price: number
          notify_email: string | null
          property_rates: Json
          range_spread: number
          service_surcharges: Json
          updated_at: string
        }
        Insert: {
          frequency_multipliers?: Json
          id?: string
          min_price?: number
          notify_email?: string | null
          property_rates?: Json
          range_spread?: number
          service_surcharges?: Json
          updated_at?: string
        }
        Update: {
          frequency_multipliers?: Json
          id?: string
          min_price?: number
          notify_email?: string | null
          property_rates?: Json
          range_spread?: number
          service_surcharges?: Json
          updated_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          ai_generated_at: string | null
          ai_key_points: string[]
          ai_next_step: string | null
          ai_summary: string | null
          ai_urgency: string | null
          city: string
          client_type: Database["public"]["Enums"]["client_type"]
          company_name: string | null
          contact_name: string
          created_at: string
          desired_date: string | null
          email: string
          estimate_max: number
          estimate_min: number
          frequency: string
          id: string
          last_contacted_at: string | null
          message: string | null
          phone: string
          postal_code: string
          property_type: string
          rooms: number | null
          score: number
          services: string[]
          status: Database["public"]["Enums"]["request_status"]
          surface_m2: number
          updated_at: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_key_points?: string[]
          ai_next_step?: string | null
          ai_summary?: string | null
          ai_urgency?: string | null
          city: string
          client_type: Database["public"]["Enums"]["client_type"]
          company_name?: string | null
          contact_name: string
          created_at?: string
          desired_date?: string | null
          email: string
          estimate_max?: number
          estimate_min?: number
          frequency: string
          id?: string
          last_contacted_at?: string | null
          message?: string | null
          phone: string
          postal_code: string
          property_type: string
          rooms?: number | null
          score?: number
          services?: string[]
          status?: Database["public"]["Enums"]["request_status"]
          surface_m2?: number
          updated_at?: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_key_points?: string[]
          ai_next_step?: string | null
          ai_summary?: string | null
          ai_urgency?: string | null
          city?: string
          client_type?: Database["public"]["Enums"]["client_type"]
          company_name?: string | null
          contact_name?: string
          created_at?: string
          desired_date?: string | null
          email?: string
          estimate_max?: number
          estimate_min?: number
          frequency?: string
          id?: string
          last_contacted_at?: string | null
          message?: string | null
          phone?: string
          postal_code?: string
          property_type?: string
          rooms?: number | null
          score?: number
          services?: string[]
          status?: Database["public"]["Enums"]["request_status"]
          surface_m2?: number
          updated_at?: string
        }
        Relationships: []
      }
      request_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      client_type: "entreprise" | "sous_traitance" | "particulier"
      request_status:
        | "nouveau"
        | "contacte"
        | "devis_envoye"
        | "gagne"
        | "perdu"
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
  public: {
    Enums: {
      client_type: ["entreprise", "sous_traitance", "particulier"],
      request_status: ["nouveau", "contacte", "devis_envoye", "gagne", "perdu"],
    },
  },
} as const
