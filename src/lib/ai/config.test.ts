import { describe, expect, it } from 'vitest';

import { getAiRecommendationConfig } from '@/lib/ai/config';

describe('getAiRecommendationConfig', () => {
  it('returns defaults for missing values', () => {
    const config = getAiRecommendationConfig({} as NodeJS.ProcessEnv);

    expect(config.provider).toBe('mock');
    expect(config.apiFormat).toBe('openai');
    expect(config.path).toBe('/chat/completions');
    expect(config.defaultLimit).toBe(3);
    expect(config.maxCandidates).toBe(5);
    expect(config.recommendationCacheTtlHours).toBe(24);
    expect(config.profileCacheTtlHours).toBe(72);
  });

  it('parses pipeline specific values', () => {
    const config = getAiRecommendationConfig({
      AI_RECOMMENDATION_PROVIDER: 'remote',
      AI_RECOMMENDATION_API_FORMAT: 'openai',
      AI_RECOMMENDATION_API_KEY: 'test-key',
      AI_RECOMMENDATION_BASE_URL: 'https://example.com/v1',
      AI_RECOMMENDATION_MODEL_ID: 'base-model',
      AI_RECOMMENDATION_MODEL_FAST: 'fast-model',
      AI_RECOMMENDATION_MODEL_STRONG: 'strong-model',
      AI_PIPELINE_MAX_CANDIDATES: '8',
      AI_PIPELINE_CACHE_TTL_HOURS: '12',
      AI_PROFILE_CACHE_TTL_HOURS: '48',
    } as NodeJS.ProcessEnv);

    expect(config.provider).toBe('remote');
    expect(config.apiKey).toBe('test-key');
    expect(config.baseUrl).toBe('https://example.com/v1');
    expect(config.modelId).toBe('base-model');
    expect(config.modelFast).toBe('fast-model');
    expect(config.modelStrong).toBe('strong-model');
    expect(config.maxCandidates).toBe(8);
    expect(config.recommendationCacheTtlHours).toBe(12);
    expect(config.profileCacheTtlHours).toBe(48);
  });
});
