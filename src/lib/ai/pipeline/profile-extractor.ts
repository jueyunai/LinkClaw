import { chatJsonCompletion } from '@/lib/ai/openai-client';
import { getAiRecommendationConfig } from '@/lib/ai/config';
import { buildEventProfilePrompt } from '@/lib/ai/prompts/event-profile';
import { buildGuestProfilePrompt } from '@/lib/ai/prompts/guest-profile';
import type {
  AiProfileSourceType,
  EventDetailInput,
  EventProfile,
  GuestProfile,
  GuestProfileInput,
} from '@/lib/ai/pipeline/types';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isGuestProfile(value: unknown): value is GuestProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return (
    isStringArray(profile.expertise_tags) &&
    isStringArray(profile.interest_tags) &&
    typeof profile.seniority === 'string' &&
    typeof profile.location_preference === 'string' &&
    isStringArray(profile.networking_goals) &&
    typeof profile.profile_summary === 'string'
  );
}

function isEventProfile(value: unknown): value is EventProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return (
    isStringArray(profile.topic_tags) &&
    isStringArray(profile.ideal_guest_tags) &&
    typeof profile.seniority_preference === 'string' &&
    typeof profile.scope === 'string' &&
    typeof profile.event_type === 'string' &&
    typeof profile.event_summary === 'string'
  );
}

export function getProfileCacheKey(sourceType: AiProfileSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

export async function extractGuestProfile(input: GuestProfileInput): Promise<GuestProfile> {
  const config = getAiRecommendationConfig();
  const response = await chatJsonCompletion<GuestProfile>({
    model: config.modelFast ?? config.modelId ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: buildGuestProfilePrompt({
          displayName: input.display_name,
          bio: input.bio,
          industry: input.industry,
          city: input.city,
        }),
      },
    ],
    temperature: 0.1,
    maxTokens: 1024,
  });

  if (!response.data || !isGuestProfile(response.data)) {
    console.error('[AI] extractGuestProfile 校验失败', {
      error: response.error,
      data: response.data,
    });
    throw new Error(response.error ?? '嘉宾画像抽取失败');
  }

  return response.data;
}

export async function extractEventProfile(input: EventDetailInput): Promise<EventProfile> {
  const config = getAiRecommendationConfig();
  const response = await chatJsonCompletion<EventProfile>({
    model: config.modelFast ?? config.modelId ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: buildEventProfilePrompt({
          title: input.title,
          description: input.description,
          targetAudience: input.target_audience,
          location: input.location,
          eventDate: input.event_date,
        }),
      },
    ],
    temperature: 0.1,
    maxTokens: 1024,
  });

  if (!response.data || !isEventProfile(response.data)) {
    console.error('[AI] extractEventProfile 校验失败', {
      error: response.error,
      data: response.data,
    });
    throw new Error(response.error ?? '活动画像抽取失败');
  }

  return response.data;
}
