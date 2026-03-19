export type UserRole = "guest" | "organizer";
export type EventStatus = "draft" | "published" | "closed";
export type RegistrationType = "applied" | "invited";
export type RegistrationStatus = "pending" | "accepted" | "rejected";
export type HunterLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type BountyRank = 1 | 2 | 3 | 4 | 5;

export const HUNTER_LEVEL_META: Record<HunterLevel, { key: string; color: string }> = {
  1: { key: 'bronze', color: '#CD7F32' },
  2: { key: 'silver', color: '#C0C0C0' },
  3: { key: 'gold', color: '#FFD700' },
  4: { key: 'platinum', color: '#E5E4E2' },
  5: { key: 'diamond', color: '#B9F2FF' },
  6: { key: 'legend', color: '#FF6B35' },
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
  avatar_url: string | null;
  hunter_level: HunterLevel;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  target_audience: string | null;
  event_date: string;
  location: string;
  max_guests: number;
  bounty_rank: BountyRank;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  guest_id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  ai_match_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiRecommendation {
  id: string;
  target_type: "guest" | "event";
  target_id: string;
  recommended_id: string;
  match_score: number;
  match_reason: string;
  mutual_interest: boolean;
  guest_facing_reason: string | null;
  organizer_facing_reason: string | null;
  combined_reasons: Json;
  risks: Json;
  guest_evaluation: Json | null;
  activity_evaluation: Json | null;
  source: string | null;
  pipeline_version: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AiProfile {
  id: string;
  source_type: 'guest' | 'event';
  source_id: string;
  profile_json: Json;
  model_id: string;
  pipeline_version: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserAuthIdentity {
  id: string;
  user_id: string;
  provider: string;
  provider_subject: string;
  provider_email: string | null;
  linked_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'hunter_level'> & {
          hunter_level?: HunterLevel;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'bounty_rank'> & {
          bounty_rank?: BountyRank;
        };
        Update: Partial<
          Omit<Event, 'id' | 'organizer_id' | 'created_at' | 'updated_at'>
        >;
        Relationships: [];
      };
      registrations: {
        Row: Registration;
        Insert: Omit<Registration, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<
          Omit<
            Registration,
            'id' | 'event_id' | 'guest_id' | 'type' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      ai_recommendations: {
        Row: AiRecommendation;
        Insert: Omit<AiRecommendation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AiRecommendation, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      ai_profiles: {
        Row: AiProfile;
        Insert: Omit<AiProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AiProfile, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      user_auth_identities: {
        Row: UserAuthIdentity;
        Insert: Omit<UserAuthIdentity, 'id' | 'linked_at'>;
        Update: Partial<Omit<UserAuthIdentity, 'id' | 'user_id' | 'linked_at'>>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      registration_type: RegistrationType;
      registration_status: RegistrationStatus;
      recommendation_target: 'guest' | 'event';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
