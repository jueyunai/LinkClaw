import type { Event, Profile } from '@/types/database';

export type AiProfileSourceType = 'guest' | 'event';

export type GuestProfileInput = Pick<
  Profile,
  'id' | 'display_name' | 'bio' | 'industry' | 'city'
>;

export type EventDetailInput = Pick<
  Event,
  'id' | 'title' | 'description' | 'target_audience' | 'location' | 'event_date' | 'status'
>;

export interface GuestProfile {
  expertise_tags: string[];
  interest_tags: string[];
  seniority: 'junior' | 'mid' | 'senior' | 'executive';
  location_preference: 'local' | 'regional' | 'national' | 'international';
  networking_goals: string[];
  profile_summary: string;
}

export interface EventProfile {
  topic_tags: string[];
  ideal_guest_tags: string[];
  seniority_preference: 'any' | 'junior' | 'mid' | 'senior' | 'executive';
  scope: 'local' | 'regional' | 'national' | 'international';
  event_type: 'conference' | 'workshop' | 'meetup' | 'networking' | 'other';
  event_summary: string;
}

export interface GuestEvaluation {
  want_to_attend: boolean;
  enthusiasm: number;
  fit_reasons: string[];
  concerns: string[];
  guest_perspective_summary: string;
}

export interface ActivityEvaluation {
  want_to_invite: boolean;
  relevance: number;
  fit_reasons: string[];
  gaps: string[];
  activity_perspective_summary: string;
}

export interface MatchResult {
  match_score: number;
  mutual_interest: boolean;
  combined_reasons: string[];
  risks: string[];
  guest_facing_reason: string;
  organizer_facing_reason: string;
  questions_for_user: string[];
}

export interface RunMatchPipelineResult {
  guestProfile: GuestProfile;
  eventProfile: EventProfile;
  guestEvaluation: GuestEvaluation;
  activityEvaluation: ActivityEvaluation;
  matchResult: MatchResult;
}

export type RecommendationSource = 'mock' | 'pipeline' | 'cache';

export interface EventRecommendation {
  eventId: string;
  matchScore: number;
  mutualInterest: boolean;
  guestFacingReason: string;
  organizerFacingReason: string;
  combinedReasons: string[];
  risks: string[];
  matchReasonKey:
    | 'reasonIndustry'
    | 'reasonCity'
    | 'reasonAudience'
    | 'reasonKeywords'
    | 'reasonFallback';
  matchReasonParams?: {
    value?: string;
    keywords?: string[];
  };
  source: RecommendationSource;
}

export interface GuestRecommendation {
  guestId: string;
  matchScore: number;
  mutualInterest: boolean;
  guestFacingReason: string;
  organizerFacingReason: string;
  combinedReasons: string[];
  risks: string[];
  matchReasonKey:
    | 'guestReasonIndustry'
    | 'guestReasonCity'
    | 'guestReasonBio'
    | 'guestReasonKeywords'
    | 'guestReasonFallback';
  matchReasonParams?: {
    value?: string;
    keywords?: string[];
  };
  source: RecommendationSource;
}
