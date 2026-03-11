import { describe, expect, it } from 'vitest';
import { getAiRecommendationConfig } from '@/lib/ai/config';

describe('AI 推荐配置', () => {
  it('在未提供可选环境变量时返回默认值', () => {
    const config = getAiRecommendationConfig({
      AI_RECOMMENDATION_PROVIDER: 'mock',
    });

    expect(config).toMatchObject({
      provider: 'mock',
      apiFormat: 'openai',
      apiKey: null,
      baseUrl: null,
      modelId: null,
      path: '/chat/completions',
      timeoutMs: 30000,
      temperature: 0.4,
      maxTokens: 800,
      defaultLimit: 3,
      apiKeyHeader: 'Authorization',
    });
  });

  it('在提供环境变量时使用显式配置', () => {
    const config = getAiRecommendationConfig({
      AI_RECOMMENDATION_PROVIDER: 'remote',
      AI_RECOMMENDATION_API_FORMAT: 'anthropic',
      AI_RECOMMENDATION_API_KEY: 'test-key',
      AI_RECOMMENDATION_BASE_URL: 'https://example.com',
      AI_RECOMMENDATION_MODEL_ID: 'claude-test',
      AI_RECOMMENDATION_PATH: '/custom/messages',
      AI_RECOMMENDATION_TIMEOUT_MS: '15000',
      AI_RECOMMENDATION_TEMPERATURE: '0.2',
      AI_RECOMMENDATION_MAX_TOKENS: '512',
      AI_RECOMMENDATION_DEFAULT_LIMIT: '5',
      AI_RECOMMENDATION_API_KEY_HEADER: 'x-api-key',
    });

    expect(config).toMatchObject({
      provider: 'remote',
      apiFormat: 'anthropic',
      apiKey: 'test-key',
      baseUrl: 'https://example.com',
      modelId: 'claude-test',
      path: '/custom/messages',
      timeoutMs: 15000,
      temperature: 0.2,
      maxTokens: 512,
      defaultLimit: 5,
      apiKeyHeader: 'x-api-key',
    });
  });

  it('在数值配置非法时回退到默认值', () => {
    const config = getAiRecommendationConfig({
      AI_RECOMMENDATION_TIMEOUT_MS: '0',
      AI_RECOMMENDATION_TEMPERATURE: 'invalid',
      AI_RECOMMENDATION_MAX_TOKENS: '-1',
      AI_RECOMMENDATION_DEFAULT_LIMIT: 'NaN',
    });

    expect(config).toMatchObject({
      timeoutMs: 30000,
      temperature: 0.4,
      maxTokens: 800,
      defaultLimit: 3,
    });
  });
});
