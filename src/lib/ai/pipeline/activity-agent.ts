import { chatJsonCompletion } from '@/lib/ai/openai-client';
import { getAiRecommendationConfig } from '@/lib/ai/config';
import {
  buildActivityEvaluationSystemPrompt,
  buildActivityEvaluationUserPrompt,
} from '@/lib/ai/prompts/activity-eval';
import type {
  ActivityEvaluation,
  EventDetailInput,
  EventProfile,
  GuestProfile,
  GuestProfileInput,
} from '@/lib/ai/pipeline/types';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isActivityEvaluation(value: unknown): value is ActivityEvaluation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const evaluation = value as Record<string, unknown>;
  return (
    typeof evaluation.want_to_invite === 'boolean' &&
    typeof evaluation.relevance === 'number' &&
    isStringArray(evaluation.fit_reasons) &&
    isStringArray(evaluation.gaps) &&
    typeof evaluation.activity_perspective_summary === 'string'
  );
}

export async function evaluateGuestForEvent(input: {
  guest: GuestProfileInput;
  guestProfile: GuestProfile;
  event: EventDetailInput;
  eventProfile: EventProfile;
}): Promise<ActivityEvaluation> {
  const config = getAiRecommendationConfig();
  const response = await chatJsonCompletion<ActivityEvaluation>({
    model: config.modelFast ?? config.modelId ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: buildActivityEvaluationSystemPrompt({
          eventTitle: input.event.title,
          eventProfileJson: JSON.stringify(input.eventProfile, null, 2),
        }),
      },
      {
        role: 'user',
        content: buildActivityEvaluationUserPrompt({
          guestProfileJson: JSON.stringify(input.guestProfile, null, 2),
          displayName: input.guest.display_name,
          bio: input.guest.bio,
          industry: input.guest.industry,
          city: input.guest.city,
        }),
      },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  if (!response.data || !isActivityEvaluation(response.data)) {
    throw new Error(response.error ?? '活动分身评估失败');
  }

  return {
    ...response.data,
    relevance: Math.max(1, Math.min(10, Math.round(response.data.relevance))),
  };
}
