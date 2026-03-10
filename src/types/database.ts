export type UserRole = "guest" | "organizer";
export type EventStatus = "draft" | "published" | "closed";
export type RegistrationType = "applied" | "invited";
export type RegistrationStatus = "pending" | "accepted" | "rejected";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
  avatar_url: string | null;
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
  expires_at: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
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
        Insert: Omit<AiRecommendation, 'id' | 'created_at'>;
        Update: Partial<Omit<AiRecommendation, 'id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      registration_type: RegistrationType;
      registration_status: RegistrationStatus;
      recommendation_target: 'guest' | 'event';
    };
    CompositeTypes: Record<string, never>;
  };
}
