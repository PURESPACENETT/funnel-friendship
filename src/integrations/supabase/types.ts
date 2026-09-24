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
      linkedin_contacts: {
        Row: {
          city: string | null
          company: string | null
          contacted_at: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          linkedin_url: string | null
          notes: string | null
          role_key: string | null
          status: Database["public"]["Enums"]["prospect_status"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          company?: string | null
          contacted_at?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          role_key?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          company?: string | null
          contacted_at?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          role_key?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
        }
        Relationships: []
      }
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
      prospect_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["prospect_activity_type"]
          body: string | null
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          id: string
          metadata: Json
          occurred_at: string
          prospect_id: string
          title: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["prospect_activity_type"]
          body?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          prospect_id: string
          title: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["prospect_activity_type"]
          body?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          prospect_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_searches: {
        Row: {
          area: string
          center_lat: number | null
          center_lng: number | null
          created_at: string
          created_by: string | null
          found_count: number
          id: string
          new_count: number
          radius_km: number
          sector: string
        }
        Insert: {
          area: string
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          created_by?: string | null
          found_count?: number
          id?: string
          new_count?: number
          radius_km?: number
          sector: string
        }
        Update: {
          area?: string
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          created_by?: string | null
          found_count?: number
          id?: string
          new_count?: number
          radius_km?: number
          sector?: string
        }
        Relationships: []
      }
      prospect_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          prospect_id: string
          task_type: Database["public"]["Enums"]["prospect_task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          prospect_id: string
          task_type?: Database["public"]["Enums"]["prospect_task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          prospect_id?: string
          task_type?: Database["public"]["Enums"]["prospect_task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_tasks_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_linkedin: string | null
          contact_name: string | null
          contact_title: string | null
          created_at: string
          do_not_contact: boolean
          do_not_contact_reason: string | null
          email: string | null
          external_id: string | null
          followup_sent_at: string | null
          found_emails: string[]
          id: string
          latitude: number | null
          longitude: number | null
          loss_reason: string | null
          notes: string | null
          opportunity_type:
            | Database["public"]["Enums"]["opportunity_type"]
            | null
          outreach_body: string | null
          outreach_generated_at: string | null
          outreach_sent_at: string | null
          outreach_subject: string | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          reviews_count: number | null
          score: number
          sector: string | null
          source: string
          status: Database["public"]["Enums"]["prospect_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_linkedin?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          do_not_contact?: boolean
          do_not_contact_reason?: string | null
          email?: string | null
          external_id?: string | null
          followup_sent_at?: string | null
          found_emails?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          loss_reason?: string | null
          notes?: string | null
          opportunity_type?:
            | Database["public"]["Enums"]["opportunity_type"]
            | null
          outreach_body?: string | null
          outreach_generated_at?: string | null
          outreach_sent_at?: string | null
          outreach_subject?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          reviews_count?: number | null
          score?: number
          sector?: string | null
          source?: string
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_linkedin?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          do_not_contact?: boolean
          do_not_contact_reason?: string | null
          email?: string | null
          external_id?: string | null
          followup_sent_at?: string | null
          found_emails?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          loss_reason?: string | null
          notes?: string | null
          opportunity_type?:
            | Database["public"]["Enums"]["opportunity_type"]
            | null
          outreach_body?: string | null
          outreach_generated_at?: string | null
          outreach_sent_at?: string | null
          outreach_subject?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          reviews_count?: number | null
          score?: number
          sector?: string | null
          source?: string
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
          website?: string | null
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
          review_requested_at: string | null
          rooms: number | null
          score: number
          services: string[]
          source_external_id: string | null
          source_system: string | null
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
          review_requested_at?: string | null
          rooms?: number | null
          score?: number
          services?: string[]
          source_external_id?: string | null
          source_system?: string | null
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
          review_requested_at?: string | null
          rooms?: number | null
          score?: number
          services?: string[]
          source_external_id?: string | null
          source_system?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
      get_quote_webhook_secret: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    Enums: {
      app_role: "admin" | "staff"
      client_type: "entreprise" | "sous_traitance" | "particulier"
      opportunity_type: "vente_directe" | "sous_traitance" | "les_deux"
      prospect_activity_type:
        | "note"
        | "email_envoye"
        | "email_recu"
        | "appel"
        | "relance"
        | "rdv"
        | "visite"
        | "devis"
        | "changement_statut"
        | "tache"
      prospect_status:
        | "nouveau"
        | "qualifie"
        | "a_contacter"
        | "contacte"
        | "reponse_recue"
        | "interesse"
        | "rdv_a_prendre"
        | "rdv_effectue"
        | "visite_technique"
        | "devis_envoye"
        | "negociation"
        | "converti"
        | "perdu"
        | "ecarte"
      prospect_task_type:
        | "appeler"
        | "email"
        | "relance"
        | "rdv"
        | "visite"
        | "devis"
        | "autre"
      request_status:
        | "nouveau"
        | "contacte"
        | "devis_envoye"
        | "gagne"
        | "perdu"
      task_priority: "basse" | "normale" | "haute" | "urgente"
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
      app_role: ["admin", "staff"],
      client_type: ["entreprise", "sous_traitance", "particulier"],
      opportunity_type: ["vente_directe", "sous_traitance", "les_deux"],
      prospect_activity_type: [
        "note",
        "email_envoye",
        "email_recu",
        "appel",
        "relance",
        "rdv",
        "visite",
        "devis",
        "changement_statut",
        "tache",
      ],
      prospect_status: [
        "nouveau",
        "qualifie",
        "a_contacter",
        "contacte",
        "reponse_recue",
        "interesse",
        "rdv_a_prendre",
        "rdv_effectue",
        "visite_technique",
        "devis_envoye",
        "negociation",
        "converti",
        "perdu",
        "ecarte",
      ],
      prospect_task_type: [
        "appeler",
        "email",
        "relance",
        "rdv",
        "visite",
        "devis",
        "autre",
      ],
      request_status: ["nouveau", "contacte", "devis_envoye", "gagne", "perdu"],
      task_priority: ["basse", "normale", "haute", "urgente"],
    },
  },
} as const
