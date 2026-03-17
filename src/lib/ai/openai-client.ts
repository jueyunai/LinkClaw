import { getAiRecommendationConfig } from '@/lib/ai/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAiJsonResponse<T> {
  data: T | null;
  error: string | null;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function getAuthorizationHeader(apiKey: string, headerName: string) {
  return headerName.toLowerCase() === 'authorization' ? `Bearer ${apiKey}` : apiKey;
}

export async function chatJsonCompletion<T>(params: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OpenAiJsonResponse<T>> {
  const config = getAiRecommendationConfig();

  if (!config.baseUrl || !config.apiKey) {
    return {
      data: null,
      error: 'AI 推荐远程配置不完整',
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${config.path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        [config.apiKeyHeader]: getAuthorizationHeader(config.apiKey, config.apiKeyHeader),
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? config.temperature,
        max_tokens: params.maxTokens ?? config.maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `AI 推荐请求失败：${response.status}`,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return {
        data: null,
        error: 'AI 推荐响应为空',
        usage: {
          prompt_tokens: payload.usage?.prompt_tokens ?? 0,
          completion_tokens: payload.usage?.completion_tokens ?? 0,
          total_tokens: payload.usage?.total_tokens ?? 0,
        },
      };
    }

    try {
      return {
        data: JSON.parse(content) as T,
        error: null,
        usage: {
          prompt_tokens: payload.usage?.prompt_tokens ?? 0,
          completion_tokens: payload.usage?.completion_tokens ?? 0,
          total_tokens: payload.usage?.total_tokens ?? 0,
        },
      };
    } catch {
      return {
        data: null,
        error: 'AI 推荐返回了非法 JSON',
        usage: {
          prompt_tokens: payload.usage?.prompt_tokens ?? 0,
          completion_tokens: payload.usage?.completion_tokens ?? 0,
          total_tokens: payload.usage?.total_tokens ?? 0,
        },
      };
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'AI 推荐请求异常',
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
