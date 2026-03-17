import { chatJsonCompletion } from '@/lib/ai/openai-client';
import { getAiRecommendationConfig } from '@/lib/ai/config';
import {
  buildGuestEvaluationSystemPrompt,
  buildGuestEvaluationUserPrompt,
} from '@/lib/ai/prompts/guest-eval';
import type {
  EventDetailInput,
  EventProfile,
  GuestEvaluation,
  GuestProfile,
  GuestProfileInput,
} from '@/lib/ai/pipeline/types';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isGuestEvaluation(value: unknown): value is GuestEvaluation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const evaluation = value as Record<string, unknown>;
  return (
    typeof evaluation.want_to_attend === 'boolean' &&
    typeof evaluation.enthusiasm === 'number' &&
    isStringArray(evaluation.fit_reasons) &&
    isStringArray(evaluation.concerns) &&
    typeof evaluation.guest_perspective_summary === 'string'
  );
}

export async function evaluateEventForGuest(input: {
  guest: GuestProfileInput;
  guestProfile: GuestProfile;
  event: EventDetailInput;
  eventProfile: EventProfile;
}): Promise<GuestEvaluation> {
  const config = getAiRecommendationConfig();
  const response = await chatJsonCompletion<GuestEvaluation>({
    model: config.modelFast ?? config.modelId ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: buildGuestEvaluationSystemPrompt({
          displayName: input.guest.display_name,
          guestProfileJson: JSON.stringify(input.guestProfile, null, 2),
        }),
      },
      {
        role: 'user',
        content: buildGuestEvaluationUserPrompt({
          eventProfileJson: JSON.stringify(input.eventProfile, null, 2),
          title: input.event.title,
          description: input.event.description,
          location: input.event.location,
          eventDate: input.event.event_date,
        }),
      },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  if (!response.data || !isGuestEvaluation(response.data)) {
    throw new Error(response.error ?? '嘉宾分身评估失败');
  }

  return {
    ...response.data,
    enthusiasm: Math.max(1, Math.min(10, Math.round(response.data.enthusiasm))),
  };
}
