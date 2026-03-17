import { createAdminClient } from '@/lib/supabase/admin';
import { getAiRecommendationConfig } from '@/lib/ai/config';
import {
  getMockEventRecommendations,
  getMockRecommendedGuestsForEvent,
  type MockGuestRecommendation,
  type MockRecommendation,
} from '@/lib/ai/mock-recommendation';
import { extractEventProfile, extractGuestProfile } from '@/lib/ai/pipeline/profile-extractor';
import { runMatchPipeline } from '@/lib/ai/pipeline/run-match-pipeline';
import type {
  ActivityEvaluation,
  EventDetailInput,
  EventProfile,
  EventRecommendation,
  GuestEvaluation,
  GuestProfile,
  GuestProfileInput,
  MatchResult,
  RecommendationSource,
} from '@/lib/ai/pipeline/types';
import type { Database, Json } from '@/types/database';

const PIPELINE_VERSION = 'v2.0';

type AiProfileCacheRow = {
  profile_json: Json;
  expires_at: string;
};

type AiRecommendationCacheRow = {
  recommended_id: string;
  match_score: number;
  mutual_interest: boolean;
  guest_facing_reason: string | null;
  organizer_facing_reason: string | null;
  combined_reasons: Json;
  risks: Json;
  source: string | null;
  expires_at: string;
};

function hoursToIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function buildEventRecommendationFromMock(
  recommendation: MockRecommendation,
  source: RecommendationSource,
): EventRecommendation {
  return {
    eventId: recommendation.eventId,
    matchScore: recommendation.matchScore,
    mutualInterest: false,
    guestFacingReason: '',
    organizerFacingReason: '',
    combinedReasons: [],
    risks: [],
    matchReasonKey: recommendation.matchReasonKey,
    matchReasonParams: recommendation.matchReasonParams,
    source,
  };
}

function clampArray(value: string[], max = 3) {
  return value.filter(Boolean).slice(0, max);
}

function inferFallbackEventReason(input: {
  guestProfile: GuestProfile;
  eventProfile: EventProfile;
}) {
  const sharedKeywords = [...input.guestProfile.expertise_tags, ...input.guestProfile.interest_tags].filter(
    (tag) =>
      input.eventProfile.topic_tags.includes(tag) || input.eventProfile.ideal_guest_tags.includes(tag),
  );

  if (sharedKeywords.length > 0) {
    return {
      matchReasonKey: 'reasonKeywords' as const,
      matchReasonParams: { keywords: clampArray(sharedKeywords) },
    };
  }

  return {
    matchReasonKey: 'reasonFallback' as const,
    matchReasonParams: undefined,
  };
}

function buildEventRecommendationFromPipeline(input: {
  event: EventDetailInput;
  guestProfile: GuestProfile;
  eventProfile: EventProfile;
  guestEvaluation: GuestEvaluation;
  activityEvaluation: ActivityEvaluation;
  matchResult: MatchResult;
  source: RecommendationSource;
}): EventRecommendation {
  const fallbackReason = inferFallbackEventReason({
    guestProfile: input.guestProfile,
    eventProfile: input.eventProfile,
  });

  return {
    eventId: input.event.id,
    matchScore: input.matchResult.match_score,
    mutualInterest: input.matchResult.mutual_interest,
    guestFacingReason: input.matchResult.guest_facing_reason,
    organizerFacingReason: input.matchResult.organizer_facing_reason,
    combinedReasons: clampArray(input.matchResult.combined_reasons),
    risks: clampArray(input.matchResult.risks, 2),
    matchReasonKey: fallbackReason.matchReasonKey,
    matchReasonParams: fallbackReason.matchReasonParams,
    source: input.source,
  };
}

async function getCachedGuestProfile(sourceId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('ai_profiles')
    .select('profile_json, expires_at')
    .eq('source_type', 'guest')
    .eq('source_id', sourceId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  const profileRow = data as AiProfileCacheRow | null;
  return (profileRow?.profile_json as GuestProfile | null) ?? null;
}

async function getCachedEventProfile(sourceId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('ai_profiles')
    .select('profile_json, expires_at')
    .eq('source_type', 'event')
    .eq('source_id', sourceId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  const profileRow = data as AiProfileCacheRow | null;
  return (profileRow?.profile_json as EventProfile | null) ?? null;
}

async function upsertGuestProfile(sourceId: string, profile: GuestProfile, modelId: string) {
  const admin = createAdminClient();
  const record: Database['public']['Tables']['ai_profiles']['Insert'] = {
    source_type: 'guest',
    source_id: sourceId,
    profile_json: toJson(profile),
    model_id: modelId,
    pipeline_version: PIPELINE_VERSION,
    expires_at: hoursToIso(getAiRecommendationConfig().profileCacheTtlHours),
  };

  await admin.from('ai_profiles').upsert(record as never, {
    onConflict: 'source_type,source_id',
  });
}

async function upsertEventProfile(sourceId: string, profile: EventProfile, modelId: string) {
  const admin = createAdminClient();
  const record: Database['public']['Tables']['ai_profiles']['Insert'] = {
    source_type: 'event',
    source_id: sourceId,
    profile_json: toJson(profile),
    model_id: modelId,
    pipeline_version: PIPELINE_VERSION,
    expires_at: hoursToIso(getAiRecommendationConfig().profileCacheTtlHours),
  };

  await admin.from('ai_profiles').upsert(record as never, {
    onConflict: 'source_type,source_id',
  });
}

async function getCachedEventRecommendation(guestId: string, eventId: string): Promise<EventRecommendation | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('ai_recommendations')
    .select(
      'recommended_id, match_score, mutual_interest, guest_facing_reason, organizer_facing_reason, combined_reasons, risks, source, expires_at',
    )
    .eq('target_type', 'guest')
    .eq('target_id', guestId)
    .eq('recommended_id', eventId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  const recommendationRow = data as AiRecommendationCacheRow | null;

  if (!recommendationRow) {
    return null;
  }

  return {
    eventId: recommendationRow.recommended_id,
    matchScore: Math.round(recommendationRow.match_score),
    mutualInterest: recommendationRow.mutual_interest,
    guestFacingReason: recommendationRow.guest_facing_reason ?? '',
    organizerFacingReason: recommendationRow.organizer_facing_reason ?? '',
    combinedReasons: Array.isArray(recommendationRow.combined_reasons)
      ? recommendationRow.combined_reasons.filter((item): item is string => typeof item === 'string')
      : [],
    risks: Array.isArray(recommendationRow.risks)
      ? recommendationRow.risks.filter((item): item is string => typeof item === 'string')
      : [],
    matchReasonKey: 'reasonFallback',
    matchReasonParams: undefined,
    source: 'cache',
  };
}

async function upsertEventRecommendation(input: {
  guestId: string;
  eventId: string;
  recommendation: EventRecommendation;
  guestEvaluation: GuestEvaluation;
  activityEvaluation: ActivityEvaluation;
}) {
  const admin = createAdminClient();
  const record: Database['public']['Tables']['ai_recommendations']['Insert'] = {
    target_type: 'guest',
    target_id: input.guestId,
    recommended_id: input.eventId,
    match_score: input.recommendation.matchScore,
    match_reason:
      input.recommendation.guestFacingReason ||
      input.recommendation.organizerFacingReason ||
      input.recommendation.matchReasonKey,
    mutual_interest: input.recommendation.mutualInterest,
    guest_facing_reason: input.recommendation.guestFacingReason || null,
    organizer_facing_reason: input.recommendation.organizerFacingReason || null,
    combined_reasons: toJson(input.recommendation.combinedReasons),
    risks: toJson(input.recommendation.risks),
    guest_evaluation: toJson(input.guestEvaluation),
    activity_evaluation: toJson(input.activityEvaluation),
    source: input.recommendation.source,
    pipeline_version: PIPELINE_VERSION,
    expires_at: hoursToIso(getAiRecommendationConfig().recommendationCacheTtlHours),
  };

  await admin.from('ai_recommendations').upsert(record as never, {
    onConflict: 'target_type,target_id,recommended_id',
  });
}

export async function getEventRecommendations(
  profile: GuestProfileInput,
  events: EventDetailInput[],
  limit = getAiRecommendationConfig().defaultLimit,
): Promise<EventRecommendation[]> {
  const config = getAiRecommendationConfig();
  const candidateEvents = events.slice(0, config.maxCandidates);

  if (config.provider !== 'remote' || !config.apiKey || !config.baseUrl) {
    return getMockEventRecommendations(profile, candidateEvents, limit).map((recommendation) =>
      buildEventRecommendationFromMock(recommendation, 'mock'),
    );
  }

  try {
    const cachedGuestProfile = await getCachedGuestProfile(profile.id);
    const guestProfile = cachedGuestProfile ?? (await extractGuestProfile(profile));

    if (!cachedGuestProfile) {
      await upsertGuestProfile(
        profile.id,
        guestProfile,
        config.modelFast ?? config.modelId ?? 'gpt-4o-mini',
      );
    }

    const recommendations = await Promise.all(
      candidateEvents.map(async (event) => {
        const cachedRecommendation = await getCachedEventRecommendation(profile.id, event.id);
        if (cachedRecommendation) {
          return cachedRecommendation;
        }

        const cachedEventProfile = await getCachedEventProfile(event.id);
        const eventProfile = cachedEventProfile ?? (await extractEventProfile(event));

        if (!cachedEventProfile) {
          await upsertEventProfile(
            event.id,
            eventProfile,
            config.modelFast ?? config.modelId ?? 'gpt-4o-mini',
          );
        }

        const pipelineResult = await runMatchPipeline({
          guest: profile,
          event,
          guestProfile,
          eventProfile,
        });

        const recommendation = buildEventRecommendationFromPipeline({
          event,
          guestProfile: pipelineResult.guestProfile,
          eventProfile: pipelineResult.eventProfile,
          guestEvaluation: pipelineResult.guestEvaluation,
          activityEvaluation: pipelineResult.activityEvaluation,
          matchResult: pipelineResult.matchResult,
          source: 'pipeline',
        });

        await upsertEventRecommendation({
          guestId: profile.id,
          eventId: event.id,
          recommendation,
          guestEvaluation: pipelineResult.guestEvaluation,
          activityEvaluation: pipelineResult.activityEvaluation,
        });

        return recommendation;
      }),
    );

    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  } catch (error) {
    console.error('[AI Recommendation] 降级到 mock 推荐', error);

    return getMockEventRecommendations(profile, candidateEvents, limit).map((recommendation) =>
      buildEventRecommendationFromMock(recommendation, 'mock'),
    );
  }
}

export function getGuestRecommendationsFallback(
  event: Pick<EventDetailInput, 'title' | 'description' | 'target_audience' | 'location'>,
  guests: Array<Pick<GuestProfileInput, 'id' | 'bio' | 'industry' | 'city'>>,
  limit = 5,
): MockGuestRecommendation[] {
  return getMockRecommendedGuestsForEvent(event, guests, limit);
}
