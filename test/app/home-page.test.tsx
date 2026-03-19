import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

import HomePage from '@/app/[locale]/page';

const createClientMock = vi.fn();
const getEventRecommendationsMock = vi.fn();

vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
  useTranslations: () => (key: string) => key,
}));

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

vi.mock('@/lib/ai/recommendation', () => ({
  getEventRecommendations: (...args: unknown[]) => getEventRecommendationsMock(...args),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEventRecommendationsMock.mockResolvedValue([]);
  });

  it('已登录但资料缺失的用户会看到资料完善引导', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'guest-1' },
          },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    bio: null,
                    industry: null,
                    city: null,
                    display_name: '嘉宾用户',
                    role: 'guest',
                    hunter_level: 1,
                  },
                })),
              })),
            })),
          };
        }

        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [],
                })),
              })),
            })),
          };
        }

        return {
          select: vi.fn(),
        };
      }),
    });

    const page = await HomePage({
      params: Promise.resolve({ locale: 'zh' }),
    });

    const html = renderToStaticMarkup(page);

    expect(html).toContain('profilePromptTitle');
    expect(html).toContain('profilePromptDescription');
    expect(html).toContain('profilePromptAction');
    expect(html).toContain('href="/profile"');
  });

  it('组织者用户显示发布悬赏按钮', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'organizer-1' },
          },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    bio: null,
                    industry: null,
                    city: null,
                    display_name: '主办方用户',
                    role: 'organizer',
                    hunter_level: 1,
                  },
                })),
              })),
            })),
          };
        }

        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [],
                })),
              })),
            })),
          };
        }

        return { select: vi.fn() };
      }),
    });

    const page = await HomePage({
      params: Promise.resolve({ locale: 'zh' }),
    });

    const html = renderToStaticMarkup(page);

    expect(html).toContain('>create<');
    expect(html).toContain('href="/events/new"');
  });

  it('guest 用户会渲染小精灵侦察与锁定态任务，并把 hunterLevel 传给推荐入口', async () => {
    getEventRecommendationsMock.mockResolvedValue([
      {
        eventId: 'event-1',
        matchScore: 91,
        mutualInterest: false,
        guestFacingReason: '',
        organizerFacingReason: '',
        combinedReasons: [],
        risks: [],
        matchReasonKey: 'reasonFallback',
        source: 'mock',
      },
    ]);

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'guest-1' },
          },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    bio: 'AI builder',
                    industry: 'AI',
                    city: 'Shanghai',
                    display_name: '嘉宾用户',
                    role: 'guest',
                    hunter_level: 1,
                  },
                })),
              })),
            })),
          };
        }

        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [
                    {
                      id: 'event-1',
                      title: '青铜任务',
                      description: 'desc',
                      location: 'Shanghai',
                      event_date: '2026-03-11T15:04:00.000Z',
                      max_guests: 20,
                      status: 'published',
                      target_audience: 'AI',
                      organizer_id: 'organizer-1',
                      bounty_rank: 1,
                    },
                    {
                      id: 'event-2',
                      title: '黄金任务',
                      description: 'desc',
                      location: 'Shenzhen',
                      event_date: '2026-03-12T15:04:00.000Z',
                      max_guests: 10,
                      status: 'published',
                      target_audience: 'Growth',
                      organizer_id: 'organizer-2',
                      bounty_rank: 3,
                    },
                  ],
                })),
              })),
            })),
          };
        }

        return { select: vi.fn() };
      }),
    });

    const page = await HomePage({
      params: Promise.resolve({ locale: 'zh' }),
    });

    const html = renderToStaticMarkup(page);

    expect(getEventRecommendationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'guest-1' }),
      expect.any(Array),
      undefined,
      1,
    );
    expect(html).toContain('title');
    expect(html).toContain('rank_required');
    expect(html).toContain('locked_card_hint');
  });
});
