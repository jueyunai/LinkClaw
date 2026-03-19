import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetAiRecommendationConfig,
  mockGetMockEventRecommendations,
  mockCreateAdminClient,
  mockExtractGuestProfile,
  mockExtractEventProfile,
  mockRunMatchPipeline,
} = vi.hoisted(() => ({
  mockGetAiRecommendationConfig: vi.fn(),
  mockGetMockEventRecommendations: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockExtractGuestProfile: vi.fn(),
  mockExtractEventProfile: vi.fn(),
  mockRunMatchPipeline: vi.fn(),
}));

vi.mock('@/lib/ai/config', () => ({
  getAiRecommendationConfig: mockGetAiRecommendationConfig,
}));

vi.mock('@/lib/ai/mock-recommendation', () => ({
  getMockEventRecommendations: mockGetMockEventRecommendations,
  getMockRecommendedGuestsForEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock('@/lib/ai/pipeline/profile-extractor', () => ({
  extractGuestProfile: mockExtractGuestProfile,
  extractEventProfile: mockExtractEventProfile,
}));

vi.mock('@/lib/ai/pipeline/run-match-pipeline', () => ({
  runMatchPipeline: mockRunMatchPipeline,
}));

import { getEventRecommendations } from '@/lib/ai/recommendation';

function createAdminClientMock(options?: {
  guestProfile?: unknown | null;
  eventProfile?: unknown | null;
  recommendation?: Record<string, unknown> | null;
}) {
  const guestProfile = options?.guestProfile ?? null;
  const eventProfile = options?.eventProfile ?? null;
  const recommendation = options?.recommendation ?? null;

  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((key: string, value: unknown) => {
          filters[key] = value;
          return query;
        }),
        gt: vi.fn(() => query),
        maybeSingle: vi.fn(async () => {
          if (table === 'ai_profiles') {
            if (filters.source_type === 'guest' && guestProfile) {
              return { data: { profile_json: guestProfile, expires_at: '2099-01-01T00:00:00.000Z' } };
            }

            if (filters.source_type === 'event' && eventProfile) {
              return { data: { profile_json: eventProfile, expires_at: '2099-01-01T00:00:00.000Z' } };
            }
          }

          if (table === 'ai_recommendations' && recommendation) {
            return { data: recommendation };
          }

          return { data: null };
        }),
        upsert: vi.fn(async () => ({ data: null, error: null })),
      };

      return query;
    },
  };
}

describe('getEventRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mock recommendations when provider is mock', async () => {
    mockGetAiRecommendationConfig.mockReturnValue({
      provider: 'mock',
      apiFormat: 'openai',
      apiKey: null,
      baseUrl: null,
      modelId: null,
      modelFast: null,
      modelStrong: null,
      path: '/chat/completions',
      timeoutMs: 30000,
      temperature: 0.4,
      maxTokens: 800,
      defaultLimit: 3,
      maxCandidates: 5,
      recommendationCacheTtlHours: 24,
      profileCacheTtlHours: 72,
      apiKeyHeader: 'Authorization',
    });

    mockGetMockEventRecommendations.mockReturnValue([
      {
        eventId: 'event-1',
        matchScore: 92,
        matchReasonKey: 'reasonIndustry',
        matchReasonParams: { value: 'AI' },
      },
    ]);

    const result = await getEventRecommendations(
      {
        id: 'guest-1',
        display_name: 'Alice',
        bio: 'AI builder',
        industry: 'AI',
        city: 'Shanghai',
      },
      [
        {
          id: 'event-1',
          title: 'AI Meetup',
          description: 'desc',
          target_audience: 'AI',
          location: 'Shanghai',
          event_date: '2026-03-20T10:00:00.000Z',
          status: 'published',
          bounty_rank: 1,
        },
      ],
    );

    expect(result).toEqual([
      {
        eventId: 'event-1',
        matchScore: 92,
        mutualInterest: false,
        guestFacingReason: '',
        organizerFacingReason: '',
        combinedReasons: [],
        risks: [],
        matchReasonKey: 'reasonIndustry',
        matchReasonParams: { value: 'AI' },
        source: 'mock',
      },
    ]);
  });

  it('filters out events above hunter level before recommendation', async () => {
    mockGetAiRecommendationConfig.mockReturnValue({
      provider: 'mock',
      apiFormat: 'openai',
      apiKey: null,
      baseUrl: null,
      modelId: null,
      modelFast: null,
      modelStrong: null,
      path: '/chat/completions',
      timeoutMs: 30000,
      temperature: 0.4,
      maxTokens: 800,
      defaultLimit: 3,
      maxCandidates: 5,
      recommendationCacheTtlHours: 24,
      profileCacheTtlHours: 72,
      apiKeyHeader: 'Authorization',
    });

    mockGetMockEventRecommendations.mockReturnValue([]);

    await getEventRecommendations(
      {
        id: 'guest-1',
        display_name: 'Alice',
        bio: 'AI builder',
        industry: 'AI',
        city: 'Shanghai',
      },
      [
        {
          id: 'event-1',
          title: 'Easy Quest',
          description: 'desc',
          target_audience: 'AI',
          location: 'Shanghai',
          event_date: '2026-03-20T10:00:00.000Z',
          status: 'published',
          bounty_rank: 1,
        },
        {
          id: 'event-2',
          title: 'Hard Quest',
          description: 'desc',
          target_audience: 'AI',
          location: 'Shanghai',
          event_date: '2026-03-21T10:00:00.000Z',
          status: 'published',
          bounty_rank: 4,
        },
      ],
      3,
      1,
    );

    expect(mockGetMockEventRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'guest-1' }),
      [
        expect.objectContaining({ id: 'event-1', bounty_rank: 1 }),
      ],
      3,
    );
  });

  it('falls back to mock recommendations when remote pipeline fails', async () => {
    mockGetAiRecommendationConfig.mockReturnValue({
      provider: 'remote',
      apiFormat: 'openai',
      apiKey: 'key',
      baseUrl: 'https://example.com/v1',
      modelId: 'base',
      modelFast: 'fast',
      modelStrong: 'strong',
      path: '/chat/completions',
      timeoutMs: 30000,
      temperature: 0.4,
      maxTokens: 800,
      defaultLimit: 3,
      maxCandidates: 5,
      recommendationCacheTtlHours: 24,
      profileCacheTtlHours: 72,
      apiKeyHeader: 'Authorization',
    });

    mockCreateAdminClient.mockImplementation(() => {
      throw new Error('service role missing');
    });
    mockGetMockEventRecommendations.mockReturnValue([
      {
        eventId: 'event-2',
        matchScore: 76,
        matchReasonKey: 'reasonFallback',
      },
    ]);

    const result = await getEventRecommendations(
      {
        id: 'guest-1',
        display_name: 'Alice',
        bio: 'AI builder',
        industry: 'AI',
        city: 'Shanghai',
      },
      [
        {
          id: 'event-2',
          title: 'Builder Night',
          description: 'desc',
          target_audience: 'builders',
          location: 'Shanghai',
          event_date: '2026-03-20T10:00:00.000Z',
          status: 'published',
          bounty_rank: 1,
        },
      ],
    );

    expect(result[0].eventId).toBe('event-2');
    expect(result[0].source).toBe('mock');
  });

  it('returns pipeline recommendations when remote pipeline succeeds', async () => {
    mockGetAiRecommendationConfig.mockReturnValue({
      provider: 'remote',
      apiFormat: 'openai',
      apiKey: 'key',
      baseUrl: 'https://example.com/v1',
      modelId: 'base',
      modelFast: 'fast',
      modelStrong: 'strong',
      path: '/chat/completions',
      timeoutMs: 30000,
      temperature: 0.4,
      maxTokens: 800,
      defaultLimit: 3,
      maxCandidates: 5,
      recommendationCacheTtlHours: 24,
      profileCacheTtlHours: 72,
      apiKeyHeader: 'Authorization',
    });

    const guestProfile = {
      expertise_tags: ['AI'],
      interest_tags: ['开发者社区'],
      seniority: 'senior',
      location_preference: 'local',
      networking_goals: ['合作'],
      profile_summary: 'AI builder',
    };
    const eventProfile = {
      topic_tags: ['AI'],
      ideal_guest_tags: ['开发者社区'],
      seniority_preference: 'senior',
      scope: 'local',
      event_type: 'meetup',
      event_summary: 'AI meetup',
    };

    mockCreateAdminClient.mockReturnValue(
      createAdminClientMock({
        guestProfile,
        eventProfile,
      }),
    );
    mockRunMatchPipeline.mockResolvedValue({
      guestProfile,
      eventProfile,
      guestEvaluation: {
        want_to_attend: true,
        enthusiasm: 9,
        fit_reasons: ['相关'],
        concerns: [],
        guest_perspective_summary: '适合参加',
      },
      activityEvaluation: {
        want_to_invite: true,
        relevance: 8,
        fit_reasons: ['合适'],
        gaps: [],
        activity_perspective_summary: '适合邀请',
      },
      matchResult: {
        match_score: 88,
        mutual_interest: true,
        combined_reasons: ['AI', '开发者社区'],
        risks: [],
        guest_facing_reason: '这场活动很适合你',
        organizer_facing_reason: '这位嘉宾值得邀请',
        questions_for_user: [],
      },
    });

    const result = await getEventRecommendations(
      {
        id: 'guest-1',
        display_name: 'Alice',
        bio: 'AI builder',
        industry: 'AI',
        city: 'Shanghai',
      },
      [
        {
          id: 'event-3',
          title: 'AI Meetup',
          description: 'desc',
          target_audience: 'AI builder',
          location: 'Shanghai',
          event_date: '2026-03-20T10:00:00.000Z',
          status: 'published',
          bounty_rank: 1,
        },
      ],
    );

    expect(mockRunMatchPipeline).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        eventId: 'event-3',
        matchScore: 88,
        mutualInterest: true,
        guestFacingReason: '这场活动很适合你',
        organizerFacingReason: '这位嘉宾值得邀请',
        combinedReasons: ['AI', '开发者社区'],
        risks: [],
        matchReasonKey: 'reasonKeywords',
        matchReasonParams: { keywords: ['AI', '开发者社区'] },
        source: 'pipeline',
      },
    ]);
  });
});
