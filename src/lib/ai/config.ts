export type AiRecommendationProvider = 'mock' | 'remote';
export type AiRecommendationApiFormat = 'openai' | 'anthropic';

export interface AiRecommendationConfig {
  provider: AiRecommendationProvider;
  apiFormat: AiRecommendationApiFormat;
  apiKey: string | null;
  baseUrl: string | null;
  modelId: string | null;
  modelFast: string | null;
  modelStrong: string | null;
  path: string;
  timeoutMs: number;
  temperature: number;
  maxTokens: number;
  defaultLimit: number;
  maxCandidates: number;
  recommendationCacheTtlHours: number;
  profileCacheTtlHours: number;
  apiKeyHeader: string;
}

const DEFAULT_PATH_BY_FORMAT: Record<AiRecommendationApiFormat, string> = {
  openai: '/chat/completions',
  anthropic: '/v1/messages',
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_LIMIT = 3;
const DEFAULT_MAX_CANDIDATES = 5;
const DEFAULT_RECOMMENDATION_CACHE_TTL_HOURS = 24;
const DEFAULT_PROFILE_CACHE_TTL_HOURS = 72;
const DEFAULT_API_KEY_HEADER = 'Authorization';

function normalizeProvider(value: string | undefined): AiRecommendationProvider {
  return value === 'remote' ? 'remote' : 'mock';
}

function normalizeApiFormat(value: string | undefined): AiRecommendationApiFormat {
  return value === 'anthropic' ? 'anthropic' : 'openai';
}

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseFloatNumber(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getAiRecommendationConfig(env: NodeJS.ProcessEnv = process.env): AiRecommendationConfig {
  const provider = normalizeProvider(env.AI_RECOMMENDATION_PROVIDER);
  const apiFormat = normalizeApiFormat(env.AI_RECOMMENDATION_API_FORMAT);
  const apiKey = normalizeOptionalString(env.AI_RECOMMENDATION_API_KEY);
  const baseUrl = normalizeOptionalString(env.AI_RECOMMENDATION_BASE_URL);
  const modelId = normalizeOptionalString(env.AI_RECOMMENDATION_MODEL_ID);
  const modelFast = normalizeOptionalString(env.AI_RECOMMENDATION_MODEL_FAST);
  const modelStrong = normalizeOptionalString(env.AI_RECOMMENDATION_MODEL_STRONG);

  return {
    provider,
    apiFormat,
    apiKey,
    baseUrl,
    modelId,
    modelFast,
    modelStrong,
    path:
      normalizeOptionalString(env.AI_RECOMMENDATION_PATH) ??
      DEFAULT_PATH_BY_FORMAT[apiFormat],
    timeoutMs: parseInteger(env.AI_RECOMMENDATION_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    temperature: parseFloatNumber(env.AI_RECOMMENDATION_TEMPERATURE, DEFAULT_TEMPERATURE),
    maxTokens: parseInteger(env.AI_RECOMMENDATION_MAX_TOKENS, DEFAULT_MAX_TOKENS),
    defaultLimit: parseInteger(env.AI_RECOMMENDATION_DEFAULT_LIMIT, DEFAULT_LIMIT),
    maxCandidates: parseInteger(env.AI_PIPELINE_MAX_CANDIDATES, DEFAULT_MAX_CANDIDATES),
    recommendationCacheTtlHours: parseInteger(
      env.AI_PIPELINE_CACHE_TTL_HOURS,
      DEFAULT_RECOMMENDATION_CACHE_TTL_HOURS,
    ),
    profileCacheTtlHours: parseInteger(
      env.AI_PROFILE_CACHE_TTL_HOURS,
      DEFAULT_PROFILE_CACHE_TTL_HOURS,
    ),
    apiKeyHeader:
      normalizeOptionalString(env.AI_RECOMMENDATION_API_KEY_HEADER) ?? DEFAULT_API_KEY_HEADER,
  };
}
