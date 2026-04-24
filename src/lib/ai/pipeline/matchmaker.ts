import { chatJsonCompletion } from '@/lib/ai/openai-client';
import { getAiRecommendationConfig } from '@/lib/ai/config';
import { buildMatchmakerSystemPrompt, buildMatchmakerUserPrompt } from '@/lib/ai/prompts/matchmaker';
import type {
  ActivityEvaluation,
  GuestEvaluation,
  MatchResult,
} from '@/lib/ai/pipeline/types';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isMatchResult(value: unknown): value is MatchResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const matchResult = value as Record<string, unknown>;
  return (
    typeof matchResult.match_score === 'number' &&
    typeof matchResult.mutual_interest === 'boolean' &&
    isStringArray(matchResult.combined_reasons) &&
    isStringArray(matchResult.risks) &&
    typeof matchResult.guest_facing_reason === 'string' &&
    typeof matchResult.organizer_facing_reason === 'string' &&
    isStringArray(matchResult.questions_for_user)
  );
}

export async function runMatchmaker(input: {
  displayName: string;
  eventTitle: string;
  guestEvaluation: GuestEvaluation;
  activityEvaluation: ActivityEvaluation;
}): Promise<MatchResult> {
  const config = getAiRecommendationConfig();
  const response = await chatJsonCompletion<MatchResult>({
    model: config.modelStrong ?? config.modelId ?? 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: buildMatchmakerSystemPrompt(),
      },
      {
        role: 'user',
        content: buildMatchmakerUserPrompt({
          displayName: input.displayName,
          eventTitle: input.eventTitle,
          guestEvaluationJson: JSON.stringify(input.guestEvaluation, null, 2),
          activityEvaluationJson: JSON.stringify(input.activityEvaluation, null, 2),
        }),
      },
    ],
    temperature: 0.4,
    maxTokens: 1200,
  });

  if (!response.data || !isMatchResult(response.data)) {
    throw new Error(response.error ?? '综合评分失败');
  }

  return {
    ...response.data,
    match_score: Math.max(0, Math.min(100, Math.round(response.data.match_score))),
  };
}
