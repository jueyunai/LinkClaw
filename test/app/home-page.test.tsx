import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

import HomePage from '@/app/[locale]/page';

const createClientMock = vi.fn();

vi.mock('next-intl', () => ({
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

vi.mock('@/lib/ai/mock-recommendation', () => ({
  getMockEventRecommendations: vi.fn(() => []),
}));

vi.mock('@/components/features/event-card', () => ({
  EventCard: ({ event }: { event: { title: string } }) => <div>{event.title}</div>,
}));

describe('HomePage', () => {
  it('嘉宾用户不显示发布活动按钮', async () => {
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

    expect(html).not.toContain('>create<');
    expect(html).not.toContain('href="/events/new"');
  });

  it('组织者用户显示发布活动按钮', async () => {
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

    expect(html).toContain('>create<');
    expect(html).toContain('href="/events/new"');
  });
});
